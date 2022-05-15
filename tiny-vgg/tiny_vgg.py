import tensorflow as tf
import numpy as np
import pandas as pd
import re
from shutil import copyfile
from glob import glob
from json import load, dump
from tensorflow.keras.layers import Dense, Flatten, Conv2D, MaxPool2D, Activation
from tensorflow.keras import Model, Sequential
from os.path import basename
from time import time
import argparse

def create_class_dict():
    # Create a new version only including tiny 200 classes
    df = pd.read_csv('./tiny-imagenet-200/words.txt', sep='\t', header=None)
    keys, classes = df[0], df[1]
    class_dict = dict(zip(keys, classes))

    tiny_class_dict = {}
    cur_index = 0

    for directory in glob('./tiny-imagenet-200/train/*'):
        cur_key = basename(directory)
        tiny_class_dict[cur_key] = {'class': class_dict[cur_key], 'index': cur_index}
        cur_index += 1

    dump(tiny_class_dict, open('./tiny-imagenet-200/class_dict.json', 'w'), indent=2)


def create_val_class_dict():
    tiny_class_dict = load(open('./tiny-imagenet-200/class_dict.json', 'r'))
    tiny_val_class_dict = {}

    # Create a dictionary for validation images
    df = pd.read_csv('./tiny-imagenet-200/val/val_annotations.txt', sep='\t', header=None)
    image_names = df[0]
    image_classes = df[1]

    for i in range(len(image_names)):
        tiny_val_class_dict[image_names[i]] = {
            'class': tiny_class_dict[image_classes[i]]['class'],
            'index': tiny_class_dict[image_classes[i]]['index'],
        }

    dump(tiny_val_class_dict, open('./tiny-imagenet-200/val_class_dict.json', 'w'), indent=2)


def split_val_data():
    # Split validation images to 50% early stopping and 50% hold-out testing
    val_images = glob('./tiny-imagenet-200/val/images/*.JPEG')
    np.random.shuffle(val_images)

    for i in range(len(val_images)):
        if i < len(val_images) // 2:
            copyfile(val_images[i], val_images[i].replace('images', 'val_images'))
        else:
            copyfile(val_images[i], val_images[i].replace('images', 'test_images'))


def process_path_train(path, width=64, height=64, num_outputs=10):
    """
    Get the (class label, processed image) pair of the given image path. This
    funciton uses python primitives, so you need to use tf.py_funciton wrapper.
    This function uses global variables:

        WIDTH(int): the width of the targeting image
        HEIGHT(int): the height of the targeting iamge
        NUM_CLASS(int): number of classes

    Args:
        path(string): path to an image file
    """

    # Get the class
    path = path.numpy()
    image_name = basename(path.decode('ascii'))
    label_name = re.sub(r'(.+)_\d+\.JPEG', r'\1', image_name)
    tiny_class_dict = get_tiny_val_class_dicts()[0]
    label_index = tiny_class_dict[label_name]['index']

    # Convert label to one-hot encoding
    label = tf.one_hot(indices=[label_index], depth=num_outputs)
    label = tf.reshape(label, [num_outputs])

    # Read image and convert the image to [0, 1] range 3d tensor
    img = tf.io.read_file(path)
    img = tf.image.decode_jpeg(img, channels=3)
    img = tf.image.convert_image_dtype(img, tf.float32)
    img = tf.image.resize(img, [width, height])

    return(img, label)


def process_path_test(path, width=64, height=64, num_outputs=10):
    """
    Get the (class label, processed image) pair of the given image path. This
    funciton uses python primitives, so you need to use tf.py_funciton wrapper.
    This function uses global variables:

        WIDTH(int): the width of the targeting image
        HEIGHT(int): the height of the targeting iamge
        NUM_CLASS(int): number of classes

    The filepath encoding for test images is different from training images.

    Args:
        path(string): path to an image file
    """

    # Get the class
    path = path.numpy()
    image_name = basename(path.decode('ascii'))
    tiny_val_class_dict = get_tiny_val_class_dicts()[1]
    label_index = tiny_val_class_dict[image_name]['index']

    # Convert label to one-hot encoding
    label = tf.one_hot(indices=[label_index], depth=num_outputs)
    label = tf.reshape(label, [num_outputs])

    # Read image and convert the image to [0, 1] range 3d tensor
    img = tf.io.read_file(path)
    img = tf.image.decode_jpeg(img, channels=3)
    img = tf.image.convert_image_dtype(img, tf.float32)
    img = tf.image.resize(img, [width, height])

    return(img, label)


def prepare_for_training(dataset, batch_size=32, cache=True,
                         shuffle_buffer_size=1000):

    if cache:
        if isinstance(cache, str):
            dataset = dataset.cache(cache)
        else:
            dataset = dataset.cache()

    # Only shuffle elements in the buffer size
    dataset = dataset.shuffle(buffer_size=shuffle_buffer_size)

    # Pre featch batches in the background
    dataset = dataset.batch(batch_size)
    dataset = dataset.prefetch(buffer_size=tf.data.experimental.AUTOTUNE)

    return dataset


def prepare_for_testing(dataset, batch_size=32, cache=True):
    if cache:
        if isinstance(cache, str):
            dataset = dataset.cache(cache)
        else:
            dataset = dataset.cache()

    # Pre featch batches in the background
    dataset = dataset.batch(batch_size)
    dataset = dataset.prefetch(buffer_size=tf.data.experimental.AUTOTUNE)

    return dataset


def TinyVGG(filters=10, num_outputs=10):
    # Use Keras Sequential API instead, since it is easy to save the model
    return Sequential([
        Conv2D(filters, (3, 3), input_shape=(64, 64, 3), name='conv_1_1'),
        Activation('relu', name='relu_1_1'),
        Conv2D(filters, (3, 3), name='conv_1_2'),
        Activation('relu', name='relu_1_2'),
        MaxPool2D((2, 2), name='max_pool_1'),

        Conv2D(filters, (3, 3), name='conv_2_1'),
        Activation('relu', name='relu_2_1'),
        Conv2D(filters, (3, 3), name='conv_2_2'),
        Activation('relu', name='relu_2_2'),
        MaxPool2D((2, 2), name='max_pool_2'),

        Flatten(name='flatten'),
        Dense(num_outputs, activation='softmax', name='output')
    ])


@tf.function
def train_step(image_batch, label_batch, optimizer, loss_object, train_mean_loss, train_accuracy):
    with tf.GradientTape() as tape:
        # Predict
        predictions = tiny_vgg(image_batch)

        # Update gradient
        loss = loss_object(label_batch, predictions)
        gradients = tape.gradient(loss, tiny_vgg.trainable_variables)
        optimizer.apply_gradients(zip(gradients, tiny_vgg.trainable_variables))

        train_mean_loss(loss)
        train_accuracy(label_batch, predictions)


@tf.function
def test_step(image_batch, label_batch, loss_object, tf_mean_loss, tf_accuracy):
    predictions = tiny_vgg(image_batch)
    vali_loss = loss_object(label_batch, predictions)

    tf_mean_loss(vali_loss)
    tf_accuracy(label_batch, predictions)


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--height', type=int, default=64, help='Image height')
    parser.add_argument('--width', type=int, default=64, help='Image width')
    parser.add_argument('--lr', type=float, default=1e-3, help='Learning rate')
    parser.add_argument('--batch-size', type=int, default=32, help='Batch size')
    parser.add_argument('--max-epochs', type=int, default=1000, help='Max Epochs to train the model')
    parser.add_argument('--patience', type=int, default=50, help='Patience training the model (current accuracy worst than last one)')
    
    args = parser.parse_args()
    return args

def get_tiny_val_class_dicts(class_dict='./data/class_dict_10.json', val_class_dict='./data/val_class_dict_10.json'):
    tiny_class_dict = load(open(class_dict, 'r'))
    tiny_val_class_dict = load(open(val_class_dict, 'r'))
    return tiny_class_dict, tiny_val_class_dict

if __name__ == '__main__':
    args = parse_args()
    # Create training and validation dataset
    num_outputs = 10

    training_images = './data/class_10_train/*/images/*.JPEG'
    vali_images     = './data/class_10_val/val_images/*.JPEG'
    test_images     = './data/class_10_val/test_images/*.JPEG'

    # Create training dataset
    train_path_dataset = tf.data.Dataset.list_files(training_images)
    train_labeld_dataset = train_path_dataset.map(lambda path: tf.py_function(process_path_train, [path, args.width, args.height, num_outputs], [tf.float32, tf.float32]))

    # Create vali dataset
    vali_path_dataset = tf.data.Dataset.list_files(vali_images)
    vali_labeld_dataset = vali_path_dataset.map(lambda path: tf.py_function(process_path_test, [path, args.width, args.height, num_outputs], [tf.float32, tf.float32]))

    # Create test dataset
    test_path_dataset = tf.data.Dataset.list_files(test_images)
    test_labeld_dataset = test_path_dataset.map(lambda path: tf.py_function(process_path_test, [path, args.width, args.height, num_outputs], [tf.float32, tf.float32]))

    train_dataset = prepare_for_training(train_labeld_dataset, batch_size=args.batch_size)
    vali_dataset = prepare_for_training(vali_labeld_dataset, batch_size=args.batch_size)
    test_dataset = prepare_for_training(test_labeld_dataset, batch_size=args.batch_size)

    # Create an instance of the model
    tiny_vgg = TinyVGG(filters=10, num_outputs=num_outputs)

    # "Compile" the model with loss function and optimizer
    loss_object = tf.keras.losses.CategoricalCrossentropy()
    # optimizer = tf.keras.optimizers.Adam(learning_rate=LR)
    optimizer = tf.keras.optimizers.SGD(learning_rate=args.lr)
    train_mean_loss = tf.keras.metrics.Mean(name='train_mean_loss')
    train_accuracy = tf.keras.metrics.CategoricalAccuracy(name='train_accuracy')
    vali_mean_loss = tf.keras.metrics.Mean(name='vali_mean_loss')
    vali_accuracy = tf.keras.metrics.CategoricalAccuracy(name='vali_accuracy')
    tiny_vgg.compile(optimizer=optimizer, loss=loss_object, metrics=train_accuracy)

    # Initialize early stopping parameters
    no_improvement_epochs = 0
    best_vali_loss = np.inf
    start_time = time()
    print('Start training.\n')

    for epoch in range(args.max_epochs):
        # Train
        for image_batch, label_batch in train_dataset:
            train_step(image_batch, label_batch, optimizer, loss_object, train_mean_loss, train_accuracy)

        # Predict on the test dataset
        for image_batch, label_batch in vali_dataset:
            test_step(image_batch, label_batch, loss_object, vali_mean_loss, vali_accuracy)

        print(f'Epoch: {epoch+1}, train loss: {train_mean_loss.result():.4f}, train accuracy: {train_accuracy.result()*100:.4f},', end='')
        print(f' vali loss: {vali_mean_loss.result():.4f}, vali accuracy: {vali_accuracy.result()*100:.4f}')

        # Early stopping
        if vali_mean_loss.result() < best_vali_loss:
            no_improvement_epochs = 0
            best_vali_loss = vali_mean_loss.result()
            # Save the best model
            tiny_vgg.save('trained_vgg_best.h5')
        else:
            no_improvement_epochs += 1

        if no_improvement_epochs >= args.patience:
            print(f'Early stopping at epoch = {epoch}')
            break

        # Reset evaluation metrics
        train_mean_loss.reset_states()
        train_accuracy.reset_states()
        vali_mean_loss.reset_states()
        vali_accuracy.reset_states()

    print(f'\nFinished training, used {(time()-start_time)/60:.4f} mins.')
    # Save trained model
    tiny_vgg.save('trained_tiny_vgg.h5')
    tiny_vgg = tf.keras.models.load_model('trained_vgg_best.h5')

    # Test on hold-out test images
    test_mean_loss = tf.keras.metrics.Mean(name='test_mean_loss')
    test_accuracy = tf.keras.metrics.CategoricalAccuracy(name='test_accuracy')

    for image_batch, label_batch in test_dataset:
        test_step(image_batch, label_batch, loss_object, test_mean_loss, test_accuracy)

    print(f'\ntest loss: {test_mean_loss.result():.4f}, test accuracy: {test_accuracy.result()*100:.4f}')

