import argparse
from json import load
import tensorflow as tf
from tiny_vgg import prepare_for_testing, process_path_test, test_step

@tf.function
def test_step(model, image_batch, label_batch, tf_loss_object, tf_mean_loss, tf_accuracy):
    predictions = model(image_batch)
    vali_loss = tf_loss_object(label_batch, predictions)

    tf_mean_loss(vali_loss)
    tf_accuracy(label_batch, predictions)


def test_model(model_fn, batch_size, test_images='./data/class_10_val/test_images/*.JPEG'):
    test_path_dataset = tf.data.Dataset.list_files(test_images)
    test_labeld_dataset = test_path_dataset.map(lambda path: tf.py_function(process_path_test,[path],[tf.float32, tf.float32]))
    test_dataset = prepare_for_testing(test_labeld_dataset, batch_size=batch_size)

    model = tf.keras.models.load_model(model_fn)

    loss_object = tf.keras.losses.CategoricalCrossentropy()
    test_mean_loss = tf.keras.metrics.Mean(name='test_mean_loss')
    test_accuracy = tf.keras.metrics.CategoricalAccuracy(name='test_accuracy')

    for image_batch, label_batch in test_dataset:
        test_step(model, image_batch, label_batch, loss_object, test_mean_loss, test_accuracy)

    print(f'\ntest loss: {test_mean_loss.result():.4f}, test accuracy: {test_accuracy.result()*100:.4f}')


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model',  required=True, type=str, help='Model filename')
    parser.add_argument('--batch-size', type=int, default=32, help='Batch size')
    args = parser.parse_args()
    return args

if __name__ == '__main__':
    args = parse_args()

    test_model(model_fn=args.model, batch_size=args.batch_size)