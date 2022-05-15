#!/bin/bash

MODEL='trained_tiny_vgg.h5'
BIN='oracle-group1-shard1of1.bin'
NNJSON='oracle-nn_10.json'

echo "Processing:"

echo "  '$MODEL' -> 'oracle-group1-shard1of1.bin'"
../convert_h5_to_bin.sh "$MODEL" . > /dev/null 2> /dev/null
mv group1-shard1of1.bin "$BIN"

echo "  '$MODEL' -> 'oracle-nn_10.json'"
../convert_h5_to_json.py "$MODEL" "$NNJSON" 2> /dev/null >/dev/null || { echo "ERROR"; exit 1; }

echo
echo "Please copy '$BIN' and '$NNJSON' to folder 'assets/data'"
