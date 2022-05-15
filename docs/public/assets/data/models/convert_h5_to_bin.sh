#!/bin/bash

[ $# -ne 2 ] && {
    echo "Use: $0 model.h5 target_dir"
    exit 1
}

tensorflowjs_converter --input_format keras "$1" "$2"
# It is better to ignore the file 'model.json', because it can be incompatible with tensorflowjs version.
# the problem is only the first layer description (InputLayer). It dont mind to cnn-explainer
rm -f "$2/model.json" 2> /dev/null > /dev/null
echo "Now you must rename '$2/group1-shard1of1.bin' to:"
echo "  * oracle-group1-shard1of1.bin or"
echo "  * copycat-group1-shard1of1.bin"
echo "And copy it to 'assets/data' folder."
