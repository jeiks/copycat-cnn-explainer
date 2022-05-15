#!/bin/bash

MODEL='copycat_trained_tiny_vgg.h5'
BIN='copycat-group1-shard1of1.bin'
NNJSON='copycat-nn_10.json'

echo "Processing:"

echo "  '$MODEL' -> '$BIN'"
../convert_h5_to_bin.sh "$MODEL" . > /dev/null 2> /dev/null
mv group1-shard1of1.bin "$BIN"

echo "  '$MODEL' -> '$NNJSON'"
../convert_h5_to_json.py "$MODEL" "$NNJSON" 2> /dev/null >/dev/null || { echo "ERROR"; exit 1; }

echo
echo "Please copy '$BIN' and '$NNJSON' to folder 'assets/data'"
