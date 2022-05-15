# Train a Tiny VGG

This directory includes code and data to train a Tiny VGG model
(inspired by the demo CNN in [Stanford CS231n class](http://cs231n.stanford.edu))
on 10 everyday classes from the [Tiny ImageNet](https://tiny-imagenet.herokuapp.com).

## Installation

First, you must unzip `data.zip` (already provided in the CNN Explainer repository). The file structure is like:

```
.
├── data
│   ├── class_10_train
│   │   ├── n01882714
│   │   │   ├── images [500 entries exceeds filelimit, not opening dir]
│   │   │   └── n01882714_boxes.txt
│   │   ├── n02165456
│   │   │   ├── images [500 entries exceeds filelimit, not opening dir]
│   │   │   └── n02165456_boxes.txt
│   │   ├── n02509815
│   │   │   ├── images [500 entries exceeds filelimit, not opening dir]
│   │   │   └── n02509815_boxes.txt
│   │   ├── n03662601
│   │   │   ├── images [500 entries exceeds filelimit, not opening dir]
│   │   │   └── n03662601_boxes.txt
│   │   ├── n04146614
│   │   │   ├── images [500 entries exceeds filelimit, not opening dir]
│   │   │   └── n04146614_boxes.txt
│   │   ├── n04285008
│   │   │   ├── images [500 entries exceeds filelimit, not opening dir]
│   │   │   └── n04285008_boxes.txt
│   │   ├── n07720875
│   │   │   ├── images [500 entries exceeds filelimit, not opening dir]
│   │   │   └── n07720875_boxes.txt
│   │   ├── n07747607
│   │   │   ├── images [500 entries exceeds filelimit, not opening dir]
│   │   │   └── n07747607_boxes.txt
│   │   ├── n07873807
│   │   │   ├── images [500 entries exceeds filelimit, not opening dir]
│   │   │   └── n07873807_boxes.txt
│   │   └── n07920052
│   │       ├── images [500 entries exceeds filelimit, not opening dir]
│   │       └── n07920052_boxes.txt
│   ├── class_10_val
│   │   ├── test_images [250 entries exceeds filelimit, not opening dir]
│   │   └── val_images [250 entries exceeds filelimit, not opening dir]
│   ├── class_dict_10.json
│   └── val_class_dict_10.json
```
Then download the [Tiny ImageNet](https://tiny-imagenet.herokuapp.com) or [ImageNet](https://www.image-net.org/) images and select N different classes (which are not in the train folder).
<br>We used 99K images, but feel free to experiment with a different number of images.
<br>Copy the classes folders to `data/copycat`. The file structure should look like this:

```
.
├── data
│   ├── copycat
│   │   ├── n02489166
│   │   │   ├── images
│   │   ├── n02364673
│   │   │   ├── images
│   │   ├── n02114548
│   │   │   ├── images
│   │   ├── ...
│   │   │   ├── images
│   │   ├── ...
│   │   │   ├── images
...
```
NOTE: make sure the extension of the images is `JPEG`. The reference to these images is in the file `tiny_vgg_copycat.py`, `line 74`.

To install all dependencies, run the following code:

```
$ conda env create --file environment.yaml
```

## Training

To train Tiny VGG on these 10 classes, run the following code:

```sh
$ python tiny_vgg.py
```

After training, two models will be saved in Keras format:
* `trained_tiny_vgg.h5`: final model after training.
* `trained_vgg_best.h5`: model having the best validation performance.

You can use either one for CNN Explainer.

## Copycat

To train the Copycat model, run the following code:

```sh
$ python tiny_vgg_copycat.py --oracle trained_tiny_vgg.h5
```

After training, one model will be saved in Keras format:
* `copycat_trained_tiny_vgg.h5`: final model after training.

## Convert Model Format

To see the models in CNN Explainer, run the following commands:

```sh
# for the Oracle:
$ bash convert_h5_to_bin.sh trained_tiny_vgg.h5 ./
$ mv group1-shard1of1.bin oracle-group1-shard1of1.bin
$ python convert_h5_to_json.py trained_tiny_vgg.h5 oracle-cnn_10.json
$ cp oracle-group1-shard1of1.bin oracle-cnn_10.json BASEDIR/public/assets/data/
# for the Copycat:
$ bash convert_h5_to_bin.sh copycat_trained_tiny_vgg.h5 ./
$ mv group1-shard1of1.bin copycat-group1-shard1of1.bin
$ python convert_h5_to_json.py copycat_trained_tiny_vgg.h5 copycat-nn_10.json
$ cp copycat-group1-shard1of1.bin copycat-nn_10.json BASEDIR/public/assets/data/
```
