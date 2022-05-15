import argparse
import tensorflow as tf
from time import time
from tiny_vgg import process_path_test, prepare_for_training, TinyVGG
from tiny_vgg_test import test_model

def open_image(path, img_size=[64,64]):
    path = path.numpy()
    img = tf.io.read_file(path)
    img = tf.image.decode_jpeg(img, channels=3)
    img = tf.image.convert_image_dtype(img, tf.float32)
    img = tf.image.resize(img, img_size)

    return img

#adapted from tiny-vgg.py (the model was changed to oracle)
@tf.function
def copycat_step(image_batch):
    predictions = oracle(image_batch)
    argmax = tf.argmax(predictions, 1)
    return argmax

#adapted from tiny-vgg.py (the model was changed to copycat)
@tf.function
def copycat_train_step(image_batch, label_batch, loss_object, optimizer, train_mean_loss, train_accuracy):
    with tf.GradientTape() as tape:
        # Predict
        predictions = copycat_model(image_batch, training=True)

        # Update gradient
        loss = loss_object(label_batch, predictions)
        gradients = tape.gradient(loss, copycat_model.trainable_variables)
        optimizer.apply_gradients(zip(gradients, copycat_model.trainable_variables))

        train_mean_loss(loss)
        train_accuracy.update_state(label_batch, predictions)
        a = label_batch == tf.argmax(predictions, 1)
        return (tf.reduce_sum(tf.cast(a, dtype=tf.int32)), len(a))

#adapted from tiny-vgg.py (the model was changed to copycat)
@tf.function
def copycat_test_step(image_batch, label_batch, tf_loss_object, tf_mean_loss, tf_accuracy):
    predictions = copycat_model(image_batch)
    test_loss = tf_loss_object(label_batch, predictions)

    tf_mean_loss(test_loss)
    tf_accuracy(label_batch, predictions)

#adapted from tiny-vgg.py (the model was changed to copycat)
@tf.function
def vali_step(image_batch, label_batch, loss_object, tf_mean_loss, tf_accuracy):
    predictions = copycat_model(image_batch)
    vali_loss = loss_object(label_batch, predictions)

    tf_mean_loss(vali_loss)
    tf_accuracy(label_batch, predictions)

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--oracle',  required=True, type=str, help='Oracle filename')
    parser.add_argument('--lr', type=float, default=1e-4, help='Learning rate')
    parser.add_argument('--batch-size', type=int, default=32, help='Batch size')
    parser.add_argument('--max-epochs', type=int, default=200, help='Max Epochs to train Copycat')
    args = parser.parse_args()
    return args

if __name__ == '__main__':
    args = parse_args()
    print('Starting Copycat process...')
    # Loading Oracle:
    oracle = tf.keras.models.load_model(args.oracle)

    # Loading datasets:
    copycat_images = './data/copycat/*/*.JPEG'
    vali_images    = './data/class_10_val/val_images/*.JPEG'
    test_images    = './data/class_10_val/test_images/*.JPEG'

    copycat_path_images = tf.data.Dataset.list_files(copycat_images)
    vali_path_dataset   = tf.data.Dataset.list_files(vali_images)
    test_path_dataset   = tf.data.Dataset.list_files(test_images)

    copycat_named_images = copycat_path_images.map(lambda path: tf.py_function(open_image, [path], [tf.float32]))
    vali_labeld_dataset  = vali_path_dataset.map(lambda path: tf.py_function(process_path_test, [path], [tf.float32, tf.float32]))
    test_labeld_dataset = test_path_dataset.map(lambda path: tf.py_function(process_path_test,[path],[tf.float32, tf.float32]))

    copycat_dataset = prepare_for_training(copycat_named_images, batch_size=args.batch_size)
    vali_dataset    = prepare_for_training(vali_labeld_dataset, batch_size=args.batch_size)
    test_dataset    = prepare_for_training(test_labeld_dataset, batch_size=args.batch_size)
    
    # Starting Copycat model:
    copycat_model    = TinyVGG()
    optimizer        = tf.keras.optimizers.SGD(learning_rate=args.lr)
    copycat_loss     = tf.keras.losses.SparseCategoricalCrossentropy()
    copycat_metric   = tf.keras.metrics.SparseCategoricalCrossentropy()
    copycat_accuracy = tf.keras.metrics.SparseCategoricalAccuracy()
    copycat_model.compile(optimizer=optimizer, loss=copycat_loss, metrics=copycat_metric)

    # For validation:
    loss_object     = tf.keras.losses.CategoricalCrossentropy()
    train_mean_loss = tf.keras.metrics.Mean()
    vali_mean_loss  = tf.keras.metrics.Mean()
    vali_accuracy   = tf.keras.metrics.CategoricalAccuracy()

    # Initialize early stopping parameters
    start_time = time()
    print('Start training.\n')
    for epoch in range(args.max_epochs):
        for image_batch in copycat_dataset:
            #Getting labels from oracle
            label_batch = copycat_step(image_batch)
            #training copycat
            aux = copycat_train_step(image_batch, label_batch, copycat_loss, optimizer, train_mean_loss, copycat_accuracy)

        for image_batch, label_batch in vali_dataset:
            vali_step(image_batch, label_batch, loss_object, vali_mean_loss, vali_accuracy)
        
        print(f'Epoch: {epoch}, train loss: {train_mean_loss.result().numpy():6.4f}, train_accuracy: {copycat_accuracy.result()*100:7.4f}', end='')
        print(f' vali loss: {vali_mean_loss.result().numpy():6.4f}, vali_accuracy: {vali_accuracy.result().numpy()*100:7.4f}')

        # Reset evaluation metrics
        train_mean_loss.reset_states()
        copycat_accuracy.reset_states()
        vali_mean_loss.reset_states()
        vali_accuracy.reset_states()
    
    print('\nFinished training, used {:.4f} mins.'.format((time()-start_time) / 60))

    copycat_model.save('copycat_trained_tiny_vgg.h5')

    test_model(model_fn='copycat_trained_tiny_vgg.h5', batch_size=args.batch_size)
