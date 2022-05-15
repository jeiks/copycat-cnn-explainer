/* global d3, SmoothScroll */

import {
  copycat_svgStore, copycat_vSpaceAroundGapStore, copycat_hSpaceAroundGapStore, copycat_cnnStore,
  copycat_nodeCoordinateStore, copycat_selectedScaleLevelStore, copycat_cnnLayerRangesStore,
  copycat_detailedModeStore, copycat_cnnLayerMinMaxStore, copycat_hoverInfoStore
} from '../stores.js';
import {
  getExtent, getLinkData
} from './draw-utils.js';
import { copycat_overviewConfig } from '../config.js';

// Configs
const layerColorScales = copycat_overviewConfig.layerColorScales;
const nodeLength = copycat_overviewConfig.nodeLength;
const numLayers = copycat_overviewConfig.numLayers;
const edgeOpacity = copycat_overviewConfig.edgeOpacity;
const edgeInitColor = copycat_overviewConfig.edgeInitColor;
const edgeStrokeWidth = copycat_overviewConfig.edgeStrokeWidth;
const svgPaddings = copycat_overviewConfig.svgPaddings;
const gapRatio = copycat_overviewConfig.gapRatio;
const classLists = copycat_overviewConfig.classLists;
const formater = d3.format('.4f');

// Shared variables
let svg = undefined;
copycat_svgStore.subscribe( value => {svg = value;} )

let vSpaceAroundGap = undefined;
copycat_vSpaceAroundGapStore.subscribe( value => {vSpaceAroundGap = value;} )

let hSpaceAroundGap = undefined;
copycat_hSpaceAroundGapStore.subscribe( value => {hSpaceAroundGap = value;} )

let cnn = undefined;
copycat_cnnStore.subscribe( value => {cnn = value;} )

let nodeCoordinate = undefined;
copycat_nodeCoordinateStore.subscribe( value => {nodeCoordinate = value;} )

let selectedScaleLevel = undefined;
copycat_selectedScaleLevelStore.subscribe( value => {selectedScaleLevel = value;} )

let cnnLayerRanges = undefined;
copycat_cnnLayerRangesStore.subscribe( value => {cnnLayerRanges = value;} )

let cnnLayerMinMax = undefined;
copycat_cnnLayerMinMaxStore.subscribe( value => {cnnLayerMinMax = value;} )

let detailedMode = undefined;
copycat_detailedModeStore.subscribe( value => {detailedMode = value;} )

/**
 * Use bounded d3 data to draw one canvas
 * @param {object} d d3 data
 * @param {index} i d3 data index
 * @param {[object]} g d3 group
 * @param {number} range color range map (max - min)
 */
export const copycat_drawOutput = (d, i, g, range) => {
  let image = g[i];
  let colorScale = layerColorScales[d.type];

  if (d.type === 'input') {
    colorScale = colorScale[d.index];
  }

  // Set up a second convas in order to resize image
  let imageLength = d.output.length === undefined ? 1 : d.output.length;
  let bufferCanvas = document.createElement("canvas");
  let bufferContext = bufferCanvas.getContext("2d");
  bufferCanvas.width = imageLength;
  bufferCanvas.height = imageLength;

  // Fill image pixel array
  let imageSingle = bufferContext.getImageData(0, 0, imageLength, imageLength);
  let imageSingleArray = imageSingle.data;

  if (imageLength === 1) {
    imageSingleArray[0] = d.output;
  } else {
    for (let i = 0; i < imageSingleArray.length; i+=4) {
      let pixeIndex = Math.floor(i / 4);
      let row = Math.floor(pixeIndex / imageLength);
      let column = pixeIndex % imageLength;
      let color = undefined;
      if (d.type === 'input' || d.type === 'fc' ) {
        color = d3.rgb(colorScale(1 - d.output[row][column]))
      } else {
        color = d3.rgb(colorScale((d.output[row][column] + range / 2) / range));
      }

      imageSingleArray[i] = color.r;
      imageSingleArray[i + 1] = color.g;
      imageSingleArray[i + 2] = color.b;
      imageSingleArray[i + 3] = 255;
    }
  }

  // canvas.toDataURL() only exports image in 96 DPI, so we can hack it to have
  // higher DPI by rescaling the image using canvas magic
  let largeCanvas = document.createElement('canvas');
  largeCanvas.width = nodeLength * 3;
  largeCanvas.height = nodeLength * 3;
  let largeCanvasContext = largeCanvas.getContext('2d');

  // Use drawImage to resize the original pixel array, and put the new image
  // (canvas) into corresponding canvas
  bufferContext.putImageData(imageSingle, 0, 0);
  largeCanvasContext.drawImage(bufferCanvas, 0, 0, imageLength, imageLength,
    0, 0, nodeLength * 3, nodeLength * 3);
  
  let imageDataURL = largeCanvas.toDataURL();
  d3.select(image).attr('xlink:href', imageDataURL);

  // Destory the buffer canvas
  bufferCanvas.remove();
  largeCanvas.remove();
}

/**
 * Draw bar chart to encode the output value
 * @param {object} d d3 data
 * @param {index} i d3 data index
 * @param {[object]} g d3 group
 * @param {function} scale map value to length
 */
const copycat_drawOutputScore = (d, i, g, scale) => {
  let group = d3.select(g[i]);
  group.select('rect.output-rect')
    .transition('output')
    .delay(500)
    .duration(800)
    .ease(d3.easeCubicIn)
    .attr('width', scale(d.output))
}

export const copycat_drawCustomImage = (image, inputLayer) => {

  let imageWidth = image.width;
  // Set up a second convas in order to resize image
  let imageLength = inputLayer[0].output.length;
  let bufferCanvas = document.createElement("canvas");
  let bufferContext = bufferCanvas.getContext("2d");
  bufferCanvas.width = imageLength;
  bufferCanvas.height = imageLength;

  // Fill image pixel array
  let imageSingle = bufferContext.getImageData(0, 0, imageLength, imageLength);
  let imageSingleArray = imageSingle.data;

  for (let i = 0; i < imageSingleArray.length; i+=4) {
    let pixeIndex = Math.floor(i / 4);
    let row = Math.floor(pixeIndex / imageLength);
    let column = pixeIndex % imageLength;

    let red = inputLayer[0].output[row][column];
    let green = inputLayer[1].output[row][column];
    let blue = inputLayer[2].output[row][column];

    imageSingleArray[i] = red * 255;
    imageSingleArray[i + 1] = green * 255;
    imageSingleArray[i + 2] = blue * 255;
    imageSingleArray[i + 3] = 255;
  }

  // canvas.toDataURL() only exports image in 96 DPI, so we can hack it to have
  // higher DPI by rescaling the image using canvas magic
  let largeCanvas = document.createElement('canvas');
  largeCanvas.width = imageWidth * 3;
  largeCanvas.height = imageWidth * 3;
  let largeCanvasContext = largeCanvas.getContext('2d');

  // Use drawImage to resize the original pixel array, and put the new image
  // (canvas) into corresponding canvas
  bufferContext.putImageData(imageSingle, 0, 0);
  largeCanvasContext.drawImage(bufferCanvas, 0, 0, imageLength, imageLength,
    0, 0, imageWidth * 3, imageWidth * 3);
  
  let imageDataURL = largeCanvas.toDataURL();
  // d3.select(image).attr('xlink:href', imageDataURL);
  image.src = imageDataURL;

  // Destory the buffer canvas
  bufferCanvas.remove();
  largeCanvas.remove();
}

/**
 * Create color gradient for the copycatlegend
 * @param {[object]} g d3 group
 * @param {function} colorScale Colormap
 * @param {string} gradientName Label for gradient def
 * @param {number} min Min of copycatlegend value
 * @param {number} max Max of copycatlegend value
 */
const getLegendGradient = (g, colorScale, gradientName, min, max) => {
  if (min === undefined) { min = 0; }
  if (max === undefined) { max = 1; }
  let gradient = g.append('defs')
    .append('svg:linearGradient')
    .attr('id', `${gradientName}`)
    .attr('x1', '0%')
    .attr('y1', '100%')
    .attr('x2', '100%')
    .attr('y2', '100%')
    .attr('spreadMethod', 'pad');
  let interpolation = 10
  for (let i = 0; i < interpolation; i++) {
    let curProgress = i / (interpolation - 1);
    let curColor = colorScale(curProgress * (max - min) + min);
    gradient.append('stop')
      .attr('offset', `${curProgress * 100}%`)
      .attr('stop-color', curColor)
      .attr('stop-opacity', 1);
  }
}

/**
 * Draw all copycatlegends
 * @param {object} copycatlegends Parent group
 * @param {number} copycatlegendHeight Height of the copycatlegend element
 */
const drawLegends = (copycatlegends, copycatlegendHeight) => {
  // Add local copycatlegends
  for (let i = 0; i < 2; i++){
    let start = 1 + i * 5;
    let range1 = cnnLayerRanges.local[start];
    let range2 = cnnLayerRanges.local[start + 2];

    let localLegendScale1 = d3.scaleLinear()
      .range([0, 2 * nodeLength + hSpaceAroundGap - 1.2])
      .domain([-range1 / 2, range1 / 2]);
    
    let localLegendScale2 = d3.scaleLinear()
      .range([0, 3 * nodeLength + 2 * hSpaceAroundGap - 1.2])
      .domain([-range2 / 2, range2 / 2]);

    let localLegendAxis1 = d3.axisBottom()
      .scale(localLegendScale1)
      .tickFormat(d3.format('.2f'))
      .tickValues([-range1 / 2, 0, range1 / 2]);
    
    let localLegendAxis2 = d3.axisBottom()
      .scale(localLegendScale2)
      .tickFormat(d3.format('.2f'))
      .tickValues([-range2 / 2, 0, range2 / 2]);

    let localLegend1 = copycatlegends.append('g')
      .attr('class', 'copycatlegend local-copycatlegend')
      .attr('id', `local-copycatlegend-${i}-1`)
      .classed('hidden', !detailedMode || selectedScaleLevel !== 'local')
      .attr('transform', `translate(${nodeCoordinate[start][0].x}, ${0})`);

    localLegend1.append('g')
      .attr('transform', `translate(0, ${copycatlegendHeight - 3})`)
      .call(localLegendAxis1)

    localLegend1.append('rect')
      .attr('width', 2 * nodeLength + hSpaceAroundGap)
      .attr('height', copycatlegendHeight)
      .style('fill', 'url(#convGradient)');

    let localLegend2 = copycatlegends.append('g')
      .attr('class', 'copycatlegend local-copycatlegend')
      .attr('id', `local-copycatlegend-${i}-2`)
      .classed('hidden', !detailedMode || selectedScaleLevel !== 'local')
      .attr('transform', `translate(${nodeCoordinate[start + 2][0].x}, ${0})`);

    localLegend2.append('g')
      .attr('transform', `translate(0, ${copycatlegendHeight - 3})`)
      .call(localLegendAxis2)

    localLegend2.append('rect')
      .attr('width', 3 * nodeLength + 2 * hSpaceAroundGap)
      .attr('height', copycatlegendHeight)
      .style('fill', 'url(#convGradient)');
  }

  // Add module copycatlegends
  for (let i = 0; i < 2; i++){
    let start = 1 + i * 5;
    let range = cnnLayerRanges.module[start];

    let moduleLegendScale = d3.scaleLinear()
      .range([0, 5 * nodeLength + 3 * hSpaceAroundGap +
        1 * hSpaceAroundGap * gapRatio - 1.2])
      .domain([-range / 2, range / 2]);

    let moduleLegendAxis = d3.axisBottom()
      .scale(moduleLegendScale)
      .tickFormat(d3.format('.2f'))
      .tickValues([-range / 2, -(range / 4), 0, range / 4, range / 2]);

    let moduleLegend = copycatlegends.append('g')
      .attr('class', 'copycatlegend module-copycatlegend')
      .attr('id', `module-copycatlegend-${i}`)
      .classed('hidden', !detailedMode || selectedScaleLevel !== 'module')
      .attr('transform', `translate(${nodeCoordinate[start][0].x}, ${0})`);
    
    moduleLegend.append('g')
      .attr('transform', `translate(0, ${copycatlegendHeight - 3})`)
      .call(moduleLegendAxis)

    moduleLegend.append('rect')
      .attr('width', 5 * nodeLength + 3 * hSpaceAroundGap +
        1 * hSpaceAroundGap * gapRatio)
      .attr('height', copycatlegendHeight)
      .style('fill', 'url(#convGradient)');
  }

  // Add global copycatlegends
  let start = 1;
  let range = cnnLayerRanges.global[start];

  let globalLegendScale = d3.scaleLinear()
    .range([0, 10 * nodeLength + 6 * hSpaceAroundGap +
      3 * hSpaceAroundGap * gapRatio - 1.2])
    .domain([-range / 2, range / 2]);

  let globalLegendAxis = d3.axisBottom()
    .scale(globalLegendScale)
    .tickFormat(d3.format('.2f'))
    .tickValues([-range / 2, -(range / 4), 0, range / 4, range / 2]);

  let globalLegend = copycatlegends.append('g')
    .attr('class', 'copycatlegend global-copycatlegend')
    .attr('id', 'global-copycatlegend')
    .classed('hidden', !detailedMode || selectedScaleLevel !== 'global')
    .attr('transform', `translate(${nodeCoordinate[start][0].x}, ${0})`);

  globalLegend.append('g')
    .attr('transform', `translate(0, ${copycatlegendHeight - 3})`)
    .call(globalLegendAxis)

  globalLegend.append('rect')
    .attr('width', 10 * nodeLength + 6 * hSpaceAroundGap +
      3 * hSpaceAroundGap * gapRatio)
    .attr('height', copycatlegendHeight)
    .style('fill', 'url(#convGradient)');


  // Add output copycatlegend
  let outputRectScale = d3.scaleLinear()
        .domain(cnnLayerRanges.output)
        .range([0, nodeLength - 1.2]);

  let outputLegendAxis = d3.axisBottom()
    .scale(outputRectScale)
    .tickFormat(d3.format('.1f'))
    .tickValues([0, cnnLayerRanges.output[1]])
  
  let outputLegend = copycatlegends.append('g')
    .attr('class', 'copycatlegend output-copycatlegend')
    .attr('id', 'output-copycatlegend')
    .classed('hidden', !detailedMode)
    .attr('transform', `translate(${nodeCoordinate[11][0].x}, ${0})`);
  
  outputLegend.append('g')
    .attr('transform', `translate(0, ${copycatlegendHeight - 3})`)
    .call(outputLegendAxis);

  outputLegend.append('rect')
    .attr('width', nodeLength)
    .attr('height', copycatlegendHeight)
    .style('fill', 'gray');
  
  // Add input image copycatlegend
  let inputScale = d3.scaleLinear()
    .range([0, nodeLength - 1.2])
    .domain([0, 1]);

  let inputLegendAxis = d3.axisBottom()
    .scale(inputScale)
    .tickFormat(d3.format('.1f'))
    .tickValues([0, 0.5, 1]);

  let inputLegend = copycatlegends.append('g')
    .attr('class', 'copycatlegend input-copycatlegend')
    .classed('hidden', !detailedMode)
    .attr('transform', `translate(${nodeCoordinate[0][0].x}, ${0})`);
  
  inputLegend.append('g')
    .attr('transform', `translate(0, ${copycatlegendHeight - 3})`)
    .call(inputLegendAxis);

  inputLegend.append('rect')
    .attr('x', 0.3)
    .attr('width', nodeLength - 0.3)
    .attr('height', copycatlegendHeight)
    .attr('transform', `rotate(180, ${nodeLength/2}, ${copycatlegendHeight/2})`)
    .style('stroke', 'rgb(20, 20, 20)')
    .style('stroke-width', 0.3)
    .style('fill', 'url(#inputGradient)');
}

/**
 * Draw the overview
 * @param {number} width Width of the cnn group
 * @param {number} height Height of the cnn group
 * @param {object} cnnGroup Group to appen cnn elements to
 * @param {function} nodeMouseOverHandler Callback func for mouseOver
 * @param {function} nodeMouseLeaveHandler Callback func for mouseLeave
 * @param {function} nodeClickHandler Callback func for click
 */
export const copycat_drawCNN = (width, height, cnnGroup, nodeMouseOverHandler,
  nodeMouseLeaveHandler, nodeClickHandler) => {
  // Draw the CNN
  // There are 8 short gaps and 5 long gaps
  hSpaceAroundGap = (width - nodeLength * numLayers) / (8 + 5 * gapRatio);
  copycat_hSpaceAroundGapStore.set(hSpaceAroundGap);
  let leftAccuumulatedSpace = 0;

  // Iterate through the cnn to draw nodes in each layer
  for (let l = 0; l < cnn.length; l++) {
    let curLayer = cnn[l];
    let isOutput = curLayer[0].layerName === 'output';

    nodeCoordinate.push([]);

    // Compute the x coordinate of the whole layer
    // Output layer and conv layer has long gaps
    if (isOutput || curLayer[0].type === 'conv') {
      leftAccuumulatedSpace += hSpaceAroundGap * gapRatio;
    } else {
      leftAccuumulatedSpace += hSpaceAroundGap;
    }

    // All nodes share the same x coordiante (left in div style)
    let left = leftAccuumulatedSpace;

    let layerGroup = cnnGroup.append('g')
      .attr('class', 'cnn-layer-group')
      .attr('id', `cnn-layer-group-${l}`);

    vSpaceAroundGap = (height - nodeLength * curLayer.length) /
      (curLayer.length + 1);
    copycat_vSpaceAroundGapStore.set(vSpaceAroundGap);

    let nodeGroups = layerGroup.selectAll('g.node-group')
      .data(curLayer, d => d.index)
      .enter()
      .append('g')
      .attr('class', 'node-group')
      .style('cursor', 'pointer')
      .style('pointer-events', 'all')
      .on('click', nodeClickHandler)
      .on('mouseover', nodeMouseOverHandler)
      .on('mouseleave', nodeMouseLeaveHandler)
      .classed('node-output', isOutput)
      .attr('id', (d, i) => {
        // Compute the coordinate
        // Not using transform on the group object because of a decade old
        // bug on webkit (safari)
        // https://bugs.webkit.org/show_bug.cgi?id=23113
        let top = i * nodeLength + (i + 1) * vSpaceAroundGap;
        top += svgPaddings.top;
        nodeCoordinate[l].push({x: left, y: top});
        return `layer-${l}-node-${i}`
      });
    
    // Overwrite the mouseover and mouseleave function for output nodes to show
    // hover info in the UI
    layerGroup.selectAll('g.node-output')
      .on('mouseover', (d, i, g) => {
        nodeMouseOverHandler(d, i, g);
        copycat_hoverInfoStore.set( {show: true, text: `Output value: ${formater(d.output)}`} );
      })
      .on('mouseleave', (d, i, g) => {
        nodeMouseLeaveHandler(d, i, g);
        copycat_hoverInfoStore.set( {show: false, text: `Output value: ${formater(d.output)}`} );
      });
    
    if (curLayer[0].layerName !== 'output') {
      // Embed raster image in these groups
      nodeGroups.append('image')
        .attr('class', 'node-image')
        .attr('width', nodeLength)
        .attr('height', nodeLength)
        .attr('x', left)
        .attr('y', (d, i) => nodeCoordinate[l][i].y);
      
      // Add a rectangle to show the border
      nodeGroups.append('rect')
        .attr('class', 'bounding')
        .attr('width', nodeLength)
        .attr('height', nodeLength)
        .attr('x', left)
        .attr('y', (d, i) => nodeCoordinate[l][i].y)
        .style('fill', 'none')
        .style('stroke', 'gray')
        .style('stroke-width', 1)
        .classed('hidden', true);
    } else {
      nodeGroups.append('rect')
        .attr('class', 'output-rect')
        .attr('x', left)
        .attr('y', (d, i) => nodeCoordinate[l][i].y + nodeLength / 2 + 8)
        .attr('height', nodeLength / 4)
        .attr('width', 0)
        .style('fill', 'gray');
      nodeGroups.append('text')
        .attr('class', 'output-text')
        .attr('x', left)
        .attr('y', (d, i) => nodeCoordinate[l][i].y + nodeLength / 2)
        .style('dominant-baseline', 'middle')
        .style('font-size', '11px')
        .style('fill', 'black')
        .style('opacity', 0.5)
        .text((d, i) => classLists[i]);
      
      // Add annotation text to tell readers the exact output probability
      // nodeGroups.append('text')
      //   .attr('class', 'annotation-text')
      //   .attr('id', (d, i) => `output-prob-${i}`)
      //   .attr('x', left)
      //   .attr('y', (d, i) => nodeCoordinate[l][i].y + 10)
      //   .text(d => `(${d3.format('.4f')(d.output)})`);
    }
    leftAccuumulatedSpace += nodeLength;
  }

  // Share the nodeCoordinate
  copycat_nodeCoordinateStore.set(nodeCoordinate)

  // Compute the scale of the output score width (mapping the the node
  // width to the max output score)
  let outputRectScale = d3.scaleLinear()
        .domain(cnnLayerRanges.output)
        .range([0, nodeLength]);

  // Draw the canvas
  for (let l = 0; l < cnn.length; l++) {
    let range = cnnLayerRanges[selectedScaleLevel][l];
    svg.select(`g#cnn-layer-group-${l}`)
      .selectAll('image.node-image')
      .each((d, i, g) => copycat_drawOutput(d, i, g, range));
  }

  svg.selectAll('g.node-output').each(
    (d, i, g) => copycat_drawOutputScore(d, i, g, outputRectScale)
  );

  // Add layer label
  let layerNames = cnn.map(d => {
    if (d[0].layerName === 'output') {
      return {
        name: d[0].layerName,
        dimension: `(${d.length})`
      }
    } else {
      return {
        name: d[0].layerName,
        dimension: `(${d[0].output.length}, ${d[0].output.length}, ${d.length})`
      }
    }
  });

  let svgHeight = Number(d3.select('#copycat-cnn-svg').style('height').replace('px', '')) + 150;
  let scroll = new SmoothScroll('a[href*="#"]', {offset: -svgHeight});
  
  let detailedLabels = svg.selectAll('g.layer-detailed-label')
    .data(layerNames)
    .enter()
    .append('g')
    .attr('class', 'layer-detailed-label')
    .attr('id', (d, i) => `layer-detailed-label-${i}`)
    .classed('hidden', !detailedMode)
    .attr('transform', (d, i) => {
      let x = nodeCoordinate[i][0].x + nodeLength / 2;
      let y = (svgPaddings.top + vSpaceAroundGap) / 2 - 6;
      return `translate(${x}, ${y})`;
    })
    .style('cursor', d => d.name.includes('output') ? 'default' : 'help')
    .on('click', (d) => {
      let target = '';
      if (d.name.includes('conv')) { target = 'convolution' }
      if (d.name.includes('relu')) { target = 'relu' }
      if (d.name.includes('max_pool')) { target = 'pooling'}
      if (d.name.includes('input')) { target = 'input'}

      // Scroll to a article element
      let anchor = document.querySelector(`#article-${target}`);
      scroll.animateScroll(anchor);
    });
  
  detailedLabels.append('title')
    .text('Move to article section');
    
  detailedLabels.append('text')
    .style('opacity', 0.7)
    .style('dominant-baseline', 'middle')
    .append('tspan')
    .style('font-size', '12px')
    .text(d => d.name)
    .append('tspan')
    .style('font-size', '8px')
    .style('font-weight', 'normal')
    .attr('x', 0)
    .attr('dy', '1.5em')
    .text(d => d.dimension);
  
  let labels = svg.selectAll('g.layer-label')
    .data(layerNames)
    .enter()
    .append('g')
    .attr('class', 'layer-label')
    .attr('id', (d, i) => `layer-label-${i}`)
    .classed('hidden', detailedMode)
    .attr('transform', (d, i) => {
      let x = nodeCoordinate[i][0].x + nodeLength / 2;
      let y = (svgPaddings.top + vSpaceAroundGap) / 2 + 5;
      return `translate(${x}, ${y})`;
    })
    .style('cursor', d => d.name.includes('output') ? 'default' : 'help')
    .on('click', (d) => {
      let target = '';
      if (d.name.includes('conv')) { target = 'convolution' }
      if (d.name.includes('relu')) { target = 'relu' }
      if (d.name.includes('max_pool')) { target = 'pooling'}
      if (d.name.includes('input')) { target = 'input'}

      // Scroll to a article element
      let anchor = document.querySelector(`#article-${target}`);
      scroll.animateScroll(anchor);
    });
  
  labels.append('title')
    .text('Move to article section');
  
  labels.append('text')
    .style('dominant-baseline', 'middle')
    .style('opacity', 0.8)
    .text(d => {
      if (d.name.includes('conv')) { return 'conv' }
      if (d.name.includes('relu')) { return 'relu' }
      if (d.name.includes('max_pool')) { return 'max_pool'}
      return d.name
    });

  // Add layer color scale copycatlegends
  getLegendGradient(svg, layerColorScales.conv, 'convGradient');
  getLegendGradient(svg, layerColorScales.input[0], 'inputGradient');

  let copycatlegendHeight = 5;
  let copycatlegends = svg.append('g')
      .attr('class', 'color-copycatlegend')
      .attr('transform', `translate(${0}, ${
        svgPaddings.top + vSpaceAroundGap * (10) + vSpaceAroundGap +
        nodeLength * 10
      })`);
  
  drawLegends(copycatlegends, copycatlegendHeight);

  // Add edges between nodes
  let linkGen = d3.linkHorizontal()
    .x(d => d.x)
    .y(d => d.y);
  
  let linkData = getLinkData(nodeCoordinate, cnn);

  let edgeGroup = cnnGroup.append('g')
    .attr('class', 'edge-group');
  
  edgeGroup.selectAll('path.edge')
    .data(linkData)
    .enter()
    .append('path')
    .attr('class', d =>
      `edge edge-${d.targetLayerIndex} edge-${d.targetLayerIndex}-${d.targetNodeIndex}`)
    .attr('id', d => 
      `edge-${d.targetLayerIndex}-${d.targetNodeIndex}-${d.sourceNodeIndex}`)
    .attr('d', d => linkGen({source: d.source, target: d.target}))
    .style('fill', 'none')
    .style('stroke-width', edgeStrokeWidth)
    .style('opacity', edgeOpacity)
    .style('stroke', edgeInitColor);

  // Add input channel annotations
  let inputAnnotation = cnnGroup.append('g')
    .attr('class', 'input-annotation');

  let redChannel = inputAnnotation.append('text')
    .attr('x', nodeCoordinate[0][0].x + nodeLength / 2)
    .attr('y', nodeCoordinate[0][0].y + nodeLength + 5)
    .attr('class', 'annotation-text')
    .style('dominant-baseline', 'hanging')
    .style('text-anchor', 'middle');
  
  redChannel.append('tspan')
    .style('dominant-baseline', 'hanging')
    .style('fill', '#C95E67')
    .text('Red');
  
  redChannel.append('tspan')
    .style('dominant-baseline', 'hanging')
    .text(' channel');

  inputAnnotation.append('text')
    .attr('x', nodeCoordinate[0][1].x + nodeLength / 2)
    .attr('y', nodeCoordinate[0][1].y + nodeLength + 5)
    .attr('class', 'annotation-text')
    .style('dominant-baseline', 'hanging')
    .style('text-anchor', 'middle')
    .style('fill', '#3DB665')
    .text('Green');

  inputAnnotation.append('text')
    .attr('x', nodeCoordinate[0][2].x + nodeLength / 2)
    .attr('y', nodeCoordinate[0][2].y + nodeLength + 5)
    .attr('class', 'annotation-text')
    .style('dominant-baseline', 'hanging')
    .style('text-anchor', 'middle')
    .style('fill', '#3F7FBC')
    .text('Blue');
}

/**
 * Update canvas values when user changes input image
 */
export const copycat_updateCNN = () => {
  // Compute the scale of the output score width (mapping the the node
  // width to the max output score)
  let outputRectScale = d3.scaleLinear()
      .domain(cnnLayerRanges.output)
      .range([0, nodeLength]);

  // Rebind the cnn data to layer groups layer by layer
  for (let l = 0; l < cnn.length; l++) {
    let curLayer = cnn[l];
    let range = cnnLayerRanges[selectedScaleLevel][l];
    let layerGroup = svg.select(`g#cnn-layer-group-${l}`);

    let nodeGroups = layerGroup.selectAll('g.node-group')
      .data(curLayer);

    if (l < cnn.length - 1) {
      // Redraw the canvas and output node
      nodeGroups.transition('disappear')
        .duration(300)
        .ease(d3.easeCubicOut)
        .style('opacity', 0)
        .on('end', function() {
          d3.select(this)
            .select('image.node-image')
            .each((d, i, g) => copycat_drawOutput(d, i, g, range));
          d3.select(this).transition('appear')
            .duration(700)
            .ease(d3.easeCubicIn)
            .style('opacity', 1);
        });
    } else {
      nodeGroups.each(
        (d, i, g) => copycat_drawOutputScore(d, i, g, outputRectScale)
      );
    }
  }

  // Update the color scale copycatlegend
  // Local copycatlegends
  for (let i = 0; i < 2; i++){
    let start = 1 + i * 5;
    let range1 = cnnLayerRanges.local[start];
    let range2 = cnnLayerRanges.local[start + 2];

    let localLegendScale1 = d3.scaleLinear()
      .range([0, 2 * nodeLength + hSpaceAroundGap])
      .domain([-range1 / 2, range1 / 2]);
    
    let localLegendScale2 = d3.scaleLinear()
      .range([0, 3 * nodeLength + 2 * hSpaceAroundGap])
      .domain([-range2 / 2, range2 / 2]);

    let localLegendAxis1 = d3.axisBottom()
      .scale(localLegendScale1)
      .tickFormat(d3.format('.2f'))
      .tickValues([-range1 / 2, 0, range1 / 2]);
    
    let localLegendAxis2 = d3.axisBottom()
      .scale(localLegendScale2)
      .tickFormat(d3.format('.2f'))
      .tickValues([-range2 / 2, 0, range2 / 2]);
    
    svg.select(`g#local-copycatlegend-${i}-1`).select('g').call(localLegendAxis1);
    svg.select(`g#local-copycatlegend-${i}-2`).select('g').call(localLegendAxis2);
  }

  // Module copycatlegend
  for (let i = 0; i < 2; i++){
    let start = 1 + i * 5;
    let range = cnnLayerRanges.local[start];

    let moduleLegendScale = d3.scaleLinear()
      .range([0, 5 * nodeLength + 3 * hSpaceAroundGap +
        1 * hSpaceAroundGap * gapRatio - 1.2])
      .domain([-range, range]);

    let moduleLegendAxis = d3.axisBottom()
      .scale(moduleLegendScale)
      .tickFormat(d3.format('.2f'))
      .tickValues([-range, -(range / 2), 0, range/2, range]);
    
    svg.select(`g#module-copycatlegend-${i}`).select('g').call(moduleLegendAxis);
  }

  // Global copycatlegend
  let start = 1;
  let range = cnnLayerRanges.global[start];

  let globalLegendScale = d3.scaleLinear()
    .range([0, 10 * nodeLength + 6 * hSpaceAroundGap +
      3 * hSpaceAroundGap * gapRatio - 1.2])
    .domain([-range, range]);

  let globalLegendAxis = d3.axisBottom()
    .scale(globalLegendScale)
    .tickFormat(d3.format('.2f'))
    .tickValues([-range, -(range / 2), 0, range/2, range]);

  svg.select(`g#global-copycatlegend`).select('g').call(globalLegendAxis);

  // Output copycatlegend
  let outputLegendAxis = d3.axisBottom()
    .scale(outputRectScale)
    .tickFormat(d3.format('.1f'))
    .tickValues([0, cnnLayerRanges.output[1]]);
  
  svg.select('g#output-copycatlegend').select('g').call(outputLegendAxis);
}

/**
 * Update the ranges for current CNN layers
 */
export const copycat_copycat_updateCNNLayerRanges = () => {
  // Iterate through all nodes to find a output ranges for each layer
  let cnnLayerRangesLocal = [1];
  let curRange = undefined;

  // Also track the min/max of each layer (avoid computing during intermediate
  // layer)
  cnnLayerMinMax = [];

  for (let l = 0; l < cnn.length - 1; l++) {
    let curLayer = cnn[l];

    // Compute the min max
    let outputExtents = curLayer.map(l => getExtent(l.output));
    let aggregatedExtent = outputExtents.reduce((acc, cur) => {
      return [Math.min(acc[0], cur[0]), Math.max(acc[1], cur[1])];
    })
    cnnLayerMinMax.push({min: aggregatedExtent[0], max: aggregatedExtent[1]});

    // conv layer refreshes curRange counting
    if (curLayer[0].type === 'conv' || curLayer[0].type === 'fc') {
      aggregatedExtent = aggregatedExtent.map(Math.abs);
      // Plus 0.1 to offset the rounding error (avoid black color)
      curRange = 2 * (0.1 + 
        Math.round(Math.max(...aggregatedExtent) * 1000) / 1000);
    }

    if (curRange !== undefined){
      cnnLayerRangesLocal.push(curRange);
    }
  }

  // Finally, add the output layer range
  cnnLayerRangesLocal.push(1);
  cnnLayerMinMax.push({min: 0, max: 1});

  // Support different levels of scales (1) lcoal, (2) component, (3) global
  let cnnLayerRangesComponent = [1];
  let numOfComponent = (numLayers - 2) / 5;
  for (let i = 0; i < numOfComponent; i++) {
    let curArray = cnnLayerRangesLocal.slice(1 + 5 * i, 1 + 5 * i + 5);
    let maxRange = Math.max(...curArray);
    for (let j = 0; j < 5; j++) {
      cnnLayerRangesComponent.push(maxRange);
    }
  }
  cnnLayerRangesComponent.push(1);

  let cnnLayerRangesGlobal = [1];
  let maxRange = Math.max(...cnnLayerRangesLocal.slice(1,
    cnnLayerRangesLocal.length - 1));
  for (let i = 0; i < numLayers - 2; i++) {
    cnnLayerRangesGlobal.push(maxRange);
  }
  cnnLayerRangesGlobal.push(1);

  // Update the ranges dictionary
  cnnLayerRanges.local = cnnLayerRangesLocal;
  cnnLayerRanges.module = cnnLayerRangesComponent;
  cnnLayerRanges.global = cnnLayerRangesGlobal;
  cnnLayerRanges.output = [0, d3.max(cnn[cnn.length - 1].map(d => d.output))];

  copycat_cnnLayerRangesStore.set(cnnLayerRanges);
  copycat_cnnLayerMinMaxStore.set(cnnLayerMinMax);
}