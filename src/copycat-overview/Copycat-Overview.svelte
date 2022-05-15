<script>
    // Svelte functions
    import { onMount } from 'svelte';
    import {
      copycat_cnnStore, copycat_svgStore, copycat_vSpaceAroundGapStore, copycat_hSpaceAroundGapStore,
      copycat_nodeCoordinateStore, copycat_selectedScaleLevelStore, copycat_cnnLayerRangesStore,
      copycat_needRedrawStore, copycat_cnnLayerMinMaxStore, copycat_detailedModeStore,
      copycat_shouldIntermediateAnimateStore, copycat_isInSoftmaxStore, copycat_softmaxDetailViewStore,
      copycat_hoverInfoStore, copycat_allowsSoftmaxAnimationStore, copycat_modalStore,
      copycat_intermediateLayerPositionStore
    } from '../stores.js';
  
    // Svelte views
    import ConvolutionView from './detail-view/Convolutionview.svelte';
    import ActivationView from './detail-view/Activationview.svelte';
    import PoolView from './detail-view/Poolview.svelte';
    import SoftmaxView from './detail-view/Softmaxview.svelte';
    import Modal from './Modal.svelte'
  
    // Overview functions
    import { loadTrainedModel, constructCNN } from '../utils/cnn-tf.js';
    import { copycat_overviewConfig } from '../config.js';
  
    import {
      copycat_addOverlayRect, copycat_drawConv1, copycat_drawConv2, copycat_drawConv3, copycat_drawConv4
    } from './intermediate-draw.js';
  
    import {
      copycat_moveLayerX, copycat_addOverlayGradient
    } from './intermediate-utils.js';
  
    import {
      copycat_drawFlatten, copycat_softmaxDetailViewMouseOverHandler, copycat_softmaxDetailViewMouseLeaveHandler
    } from './flatten-draw.js';
  
    import {
      copycat_drawOutput, copycat_drawCNN, copycat_updateCNN, copycat_copycat_updateCNNLayerRanges, copycat_drawCustomImage
    } from './overview-draw.js';
  
  
    // View bindings
    let overviewComponent;
    let scaleLevelSet = new Set(['local', 'module', 'global']);
    let selectedScaleLevel = 'local';
    copycat_selectedScaleLevelStore.set(selectedScaleLevel);
    let previousSelectedScaleLevel = selectedScaleLevel;
    let wholeSvg = undefined;
    let svg = undefined;
  
    $: selectedScaleLevel, selectedScaleLevelChanged();
  
    // Configs
    const layerColorScales = copycat_overviewConfig.layerColorScales;
    const nodeLength = copycat_overviewConfig.nodeLength;
    const plusSymbolRadius = copycat_overviewConfig.plusSymbolRadius;
    const numLayers = copycat_overviewConfig.numLayers;
    const edgeOpacity = copycat_overviewConfig.edgeOpacity;
    const edgeInitColor = copycat_overviewConfig.edgeInitColor;
    const edgeHoverColor = copycat_overviewConfig.edgeHoverColor;
    const edgeHoverOuting = copycat_overviewConfig.edgeHoverOuting;
    const edgeStrokeWidth = copycat_overviewConfig.edgeStrokeWidth;
    const intermediateColor = copycat_overviewConfig.intermediateColor;
    const kernelRectLength = copycat_overviewConfig.kernelRectLength;
    const svgPaddings = copycat_overviewConfig.svgPaddings;
    const gapRatio = copycat_overviewConfig.gapRatio;
    const overlayRectOffset = copycat_overviewConfig.overlayRectOffset;
    const classLists = copycat_overviewConfig.classLists;
  
    // Shared properties
    let needRedraw = [undefined, undefined];
    copycat_needRedrawStore.subscribe( value => {needRedraw = value;} );
  
    let nodeCoordinate = undefined;
    copycat_nodeCoordinateStore.subscribe( value => {nodeCoordinate = value;} )
  
    let cnnLayerRanges = undefined;
    copycat_cnnLayerRangesStore.subscribe( value => {cnnLayerRanges = value;} )
  
    let cnnLayerMinMax = undefined;
    copycat_cnnLayerMinMaxStore.subscribe( value => {cnnLayerMinMax = value;} )
  
    let detailedMode = undefined;
    copycat_detailedModeStore.subscribe( value => {detailedMode = value;} )
  
    let shouldIntermediateAnimate = undefined;
    copycat_shouldIntermediateAnimateStore.subscribe(value => {
      shouldIntermediateAnimate = value;
    })
  
    let vSpaceAroundGap = undefined;
    copycat_vSpaceAroundGapStore.subscribe( value => {vSpaceAroundGap = value;} )
  
    let hSpaceAroundGap = undefined;
    copycat_hSpaceAroundGapStore.subscribe( value => {hSpaceAroundGap = value;} )
  
    let isInSoftmax = undefined;
    copycat_isInSoftmaxStore.subscribe( value => {isInSoftmax = value;} )
  
    let softmaxDetailViewInfo = undefined;
    copycat_softmaxDetailViewStore.subscribe( value => {
      softmaxDetailViewInfo = value;
    } )
  
    let modalInfo = undefined;
    copycat_modalStore.subscribe( value => {modalInfo = value;} )
  
    let hoverInfo = undefined;
    copycat_hoverInfoStore.subscribe( value => {hoverInfo = value;} )
  
    let intermediateLayerPosition = undefined;
    copycat_intermediateLayerPositionStore.subscribe ( value => {intermediateLayerPosition = value;} )
  
    let width = undefined;
    let height = undefined;
    let model = undefined;
    let selectedNode = {layerName: '', index: -1, data: null};
    let isInIntermediateView = false;
    let isInActPoolDetailView = false;
    let actPoolDetailViewNodeIndex = -1;
    let actPoolDetailViewLayerIndex = -1;
    let detailedViewNum = undefined;
    let disableControl = false;
  
    // Wait to load
    let cnn = undefined;
  
    let detailedViewAbsCoords = {
      1 : [600, 270, 490, 290],
      2: [500, 270, 490, 290],
      3 : [700, 270, 490, 290],
      4: [600, 270, 490, 290],
      5: [650, 270, 490, 290],
      6 : [775, 270, 490, 290],
      7 : [100, 270, 490, 290],
      8 : [60, 270, 490, 290],
      9 : [200, 270, 490, 290],
      10 : [300, 270, 490, 290],
    }
  
    const layerIndexDict = {
      'input': 0,
      'conv_1_1': 1,
      'relu_1_1': 2,
      'conv_1_2': 3,
      'relu_1_2': 4,
      'max_pool_1': 5,
      'conv_2_1': 6,
      'relu_2_1': 7,
      'conv_2_2': 8,
      'relu_2_2': 9,
      'max_pool_2': 10,
      'output': 11
    }
  
    const layerLegendDict = {
      0: {local: 'input-copycatlegend', module: 'input-copycatlegend', global: 'input-copycatlegend'},
      1: {local: 'local-copycatlegend-0-1', module: 'module-copycatlegend-0', global: 'global-copycatlegend'},
      2: {local: 'local-copycatlegend-0-1', module: 'module-copycatlegend-0', global: 'global-copycatlegend'},
      3: {local: 'local-copycatlegend-0-2', module: 'module-copycatlegend-0', global: 'global-copycatlegend'},
      4: {local: 'local-copycatlegend-0-2', module: 'module-copycatlegend-0', global: 'global-copycatlegend'},
      5: {local: 'local-copycatlegend-0-2', module: 'module-copycatlegend-0', global: 'global-copycatlegend'},
      6: {local: 'local-copycatlegend-1-1', module: 'module-copycatlegend-1', global: 'global-copycatlegend'},
      7: {local: 'local-copycatlegend-1-1', module: 'module-copycatlegend-1', global: 'global-copycatlegend'},
      8: {local: 'local-copycatlegend-1-2', module: 'module-copycatlegend-1', global: 'global-copycatlegend'},
      9: {local: 'local-copycatlegend-1-2', module: 'module-copycatlegend-1', global: 'global-copycatlegend'},
      10: {local: 'local-copycatlegend-1-2', module: 'module-copycatlegend-1', global: 'global-copycatlegend'},
      11: {local: 'output-copycatlegend', module: 'output-copycatlegend', global: 'output-copycatlegend'}
    }
  
    let imageOptions = [
      {file: 'boat_1.jpeg', class: 'lifeboat'},
      {file: 'bug_1.jpeg', class: 'ladybug'},
      {file: 'pizza_1.jpeg', class: 'pizza'},
      {file: 'pepper_1.jpeg', class: 'bell pepper'},
      {file: 'bus_1.jpeg', class: 'bus'},
      {file: 'koala_1.jpeg', class: 'koala'},
      {file: 'espresso_1.jpeg', class: 'espresso'},
      {file: 'panda_1.jpeg', class: 'red panda'},
      {file: 'orange_1.jpeg', class: 'orange'},
      {file: 'car_1.jpeg', class: 'sport car'},
      {file: 'dog_1.jpeg', class: 'dog'},
      {file: 'penguim_1.jpeg', class: 'penguim'},
      {file: 'tree_1.jpeg', class: 'tree'}
    ];
    let selectedImage = imageOptions[6].file;
  
    let nodeData;
    let selectedNodeIndex = -1;
    let isExitedFromDetailedView = true;
    let isExitedFromCollapse = true;
    let customImageURL = null;
  
    // Helper functions
    const selectedScaleLevelChanged = () => {
      if (svg !== undefined) {
        if (!scaleLevelSet.add(selectedScaleLevel)) {
          console.error('Encounter unknown scale level!');
        }
  
        // Update nodes and copycatlegends
        if (selectedScaleLevel != previousSelectedScaleLevel){
          // We can simply redraw all nodes using the new color scale, or we can
          // make it faster by only redraw certian nodes
          let updatingLayerIndexDict = {
            local: {
              module: [1, 2, 8, 9, 10],
              global: [1, 2, 3, 4, 5, 8, 9, 10]
            },
            module: {
              local: [1, 2, 8, 9, 10],
              global: [1, 2, 3, 4, 5, 8, 9, 10]
            },
            global: {
              local: [1, 2, 3, 4, 5, 8, 9, 10],
              module: [1, 2, 3, 4, 5]
            }
          };
  
          let updatingLayerIndex = updatingLayerIndexDict[
            previousSelectedScaleLevel][selectedScaleLevel];
  
          updatingLayerIndex.forEach(l => {
            let range = cnnLayerRanges[selectedScaleLevel][l];
            svg.select(`#cnn-layer-group-${l}`)
              .selectAll('.node-image')
              .each((d, i, g) => copycat_drawOutput(d, i, g, range));
          });
   
          // Hide previous copycatlegend
          svg.selectAll(`.${previousSelectedScaleLevel}-copycatlegend`)
            .classed('hidden', true);
  
          // Show selected copycatlegends
          svg.selectAll(`.${selectedScaleLevel}-copycatlegend`)
            .classed('hidden', !detailedMode);
        }
        previousSelectedScaleLevel = selectedScaleLevel;
        copycat_selectedScaleLevelStore.set(selectedScaleLevel);
      }
    }
  
    const intermediateNodeMouseOverHandler = (d, i, g) => {
      if (detailedViewNum !== undefined) { return; }
      svg.select(`rect#underneath-gateway-${d.index}`)
        .style('opacity', 1);
    }
  
    const intermediateNodeMouseLeaveHandler = (d, i, g) => {
      // screenshot
      // return;
      if (detailedViewNum !== undefined) { return; }
      svg.select(`rect#underneath-gateway-${d.index}`)
        .style('opacity', 0);
    }
  
    const intermediateNodeClicked = (d, i, g, selectedI, curLayerIndex) => {
      d3.event.stopPropagation();
      isExitedFromCollapse = false;
      // Use this event to trigger the detailed view
      if (detailedViewNum === d.index) {
        // Setting this for testing purposes currently.
        selectedNodeIndex = -1; 
        // User clicks this node again -> rewind
        detailedViewNum = undefined;
        svg.select(`rect#underneath-gateway-${d.index}`)
          .style('opacity', 0);
      } 
      // We need to show a new detailed view (two cases: if we need to close the
      // old detailed view or not)
      else {
        // Setting this for testing purposes currently.
        selectedNodeIndex = d.index;
        let inputMatrix = d.output;
        let kernelMatrix = d.outputLinks[selectedI].weight;
        // let interMatrix = singleConv(inputMatrix, kernelMatrix);
        let colorScale = layerColorScales.conv;
  
        // Compute the color range
        let rangePre = cnnLayerRanges[selectedScaleLevel][curLayerIndex - 1];
        let rangeCur = cnnLayerRanges[selectedScaleLevel][curLayerIndex];
        let range = Math.max(rangePre, rangeCur);
  
        // User triggers a different detailed view
        if (detailedViewNum !== undefined) {
          // Change the underneath highlight
          svg.select(`rect#underneath-gateway-${detailedViewNum}`)
            .style('opacity', 0);
          svg.select(`rect#underneath-gateway-${d.index}`)
            .style('opacity', 1);
        }
        
        // Dynamically position the detail view
        let wholeSvg = d3.select('#copycat-cnn-svg');
        let svgYMid = +wholeSvg.style('height').replace('px', '') / 2;
        let svgWidth = +wholeSvg.style('width').replace('px', '');
        let copycatdetailViewTop = 100 + svgYMid - 250 / 2;
        let positionX = intermediateLayerPosition[Object.keys(layerIndexDict)[curLayerIndex]];
  
        let posX = 0;
        if (curLayerIndex > 6) {
          posX = (positionX - svgPaddings.left) / 2;
          posX = svgPaddings.left + posX - 486 / 2;
        } else {
          posX = (svgWidth + svgPaddings.right - positionX) / 2;
          posX = positionX + posX - 486 / 2;
        }
  
        const copycatdetailview = document.getElementById('copycatdetailview');
        copycatdetailview.style.top = `${copycatdetailViewTop}px`;
        copycatdetailview.style.left = `${posX}px`;
        copycatdetailview.style.position = 'absolute';
  
        detailedViewNum = d.index;
  
        // Send the currently used color range to detailed view
        nodeData.colorRange = range;
        nodeData.inputIsInputLayer = curLayerIndex <= 1;
      }
    }
  
    // The order of the if/else statements in this function is very critical
    const emptySpaceClicked = () => {
      // If detail view -> rewind to intermediate view
      if (detailedViewNum !== undefined) {
            // Setting this for testing purposes currently.
        selectedNodeIndex = -1; 
        // User clicks this node again -> rewind
        svg.select(`rect#underneath-gateway-${detailedViewNum}`)
          .style('opacity', 0);
        detailedViewNum = undefined;
      }
  
      // If softmax view -> rewind to flatten layer view
      else if (isInSoftmax) {
        svg.select('.softmax-symbol')
          .dispatch('click');
      }
  
      // If intermediate view -> rewind to overview
      else if (isInIntermediateView) {
        let curLayerIndex = layerIndexDict[selectedNode.layerName];
        quitIntermediateView(curLayerIndex, selectedNode.domG, selectedNode.domI);
        d3.select(selectedNode.domG[selectedNode.domI])
          .dispatch('mouseleave');
      }
  
      // If pool/act detail view -> rewind to overview
      else if (isInActPoolDetailView) {
        quitActPoolDetailView();
      }
    }
  
    const prepareToEnterIntermediateView = (d, g, i, curLayerIndex) => {
      isInIntermediateView = true;
      // Hide all copycatlegends
      svg.selectAll(`.${selectedScaleLevel}-copycatlegend`)
        .classed('hidden', true);
      svg.selectAll('.input-copycatlegend').classed('hidden', true);
      svg.selectAll('.output-copycatlegend').classed('hidden', true);
  
      // Hide the input annotation
      svg.select('.input-annotation')
        .classed('hidden', true);
  
      // Highlight the previous layer and this node
      svg.select(`g#cnn-layer-group-${curLayerIndex - 1}`)
        .selectAll('rect.bounding')
        .style('stroke-width', 2);
      
      d3.select(g[i])
        .select('rect.bounding')
        .style('stroke-width', 2);
      
      // Disable control panel UI
      // d3.select('#copycatlevel-select').property('disabled', true);
      // d3.selectAll('.image-container')
      //   .style('cursor', 'not-allowed')
      //   .on('mouseclick', () => {});
      disableControl = true;
      
      // Allow infinite animation loop
      copycat_shouldIntermediateAnimateStore.set(true);
  
      // Highlight the labels
      svg.selectAll(`g#layer-label-${curLayerIndex - 1},
        g#layer-detailed-label-${curLayerIndex - 1},
        g#layer-label-${curLayerIndex},
        g#layer-detailed-label-${curLayerIndex}`)
        .style('font-weight', '800');
      
      // Register a handler on the svg element so user can click empty space to quit
      // the intermediate view
      d3.select('#copycat-cnn-svg')
        .on('click', emptySpaceClicked);
    }
  
    const quitActPoolDetailView = () => {
      isInActPoolDetailView = false;
      actPoolDetailViewNodeIndex = -1;
  
      let layerIndex = layerIndexDict[selectedNode.layerName];
      let nodeIndex = selectedNode.index;
      svg.select(`g#layer-${layerIndex}-node-${nodeIndex}`)
        .select('rect.bounding')
        .classed('hidden', true);
  
      selectedNode.data.inputLinks.forEach(link => {
        let layerIndex = layerIndexDict[link.source.layerName];
        let nodeIndex = link.source.index;
        svg.select(`g#layer-${layerIndex}-node-${nodeIndex}`)
          .select('rect.bounding')
          .classed('hidden', true);
      })
  
      // Clean up the underneath rects
      svg.select('g.underneath')
        .selectAll('rect')
        .remove();
  
      // Show all edges
      let unimportantEdges = svg.select('g.edge-group')
        .selectAll('.edge')
        .filter(d => {
          return d.targetLayerIndex !== actPoolDetailViewLayerIndex;
        })
        .style('visibility', null);
      
      // Recover control UI
      disableControl = false;
  
      // Show copycatlegends if in detailed mode
      svg.selectAll(`.${selectedScaleLevel}-copycatlegend`)
        .classed('hidden', !detailedMode);
      svg.selectAll('.input-copycatlegend').classed('hidden', !detailedMode);
      svg.selectAll('.output-copycatlegend').classed('hidden', !detailedMode);
  
      // Also dehighlight the edge
      let edgeGroup = svg.select('g.cnn-group').select('g.edge-group');
      edgeGroup.selectAll(`path.edge-${layerIndex}-${nodeIndex}`)
        .transition()
        .ease(d3.easeCubicOut)
        .duration(200)
        .style('stroke', edgeInitColor)
        .style('stroke-width', edgeStrokeWidth)
        .style('opacity', edgeOpacity);
  
      // Remove the overlay rect
      svg.selectAll('g.copycat-intermediate-layer-overlay, g.copycat-intermediate-layer-annotation')
        .transition('remove')
        .duration(500)
        .ease(d3.easeCubicInOut)
        .style('opacity', 0)
        .on('end', (d, i, g) => {
          svg.selectAll('g.copycat-intermediate-layer-overlay, g.copycat-intermediate-layer-annotation').remove();
          svg.selectAll('defs.overlay-gradient').remove();
          svg.select('.input-annotation').classed('hidden', false);
        });
  
      // Turn the fade out nodes back
      svg.select(`g#cnn-layer-group-${layerIndex}`)
        .selectAll('g.node-group')
        .each((sd, si, sg) => {
          d3.select(sg[si])
            .style('pointer-events', 'all');
      });
  
      svg.select(`g#cnn-layer-group-${layerIndex - 1}`)
        .selectAll('g.node-group')
        .each((sd, si, sg) => {
          // Recover the old events
          d3.select(sg[si])
            .style('pointer-events', 'all')
            .on('mouseover', nodeMouseOverHandler)
            .on('mouseleave', nodeMouseLeaveHandler)
            .on('click', nodeClickHandler);
      });
  
      // Deselect the node
      selectedNode.layerName = '';
      selectedNode.index = -1;
      selectedNode.data = null;
  
      actPoolDetailViewLayerIndex = -1;
    }
  
    const actPoolDetailViewPreNodeMouseOverHandler = (d, i, g) => {
      // Highlight the edges
      let layerIndex = layerIndexDict[d.layerName];
      let nodeIndex = d.index;
      let edgeGroup = svg.select('g.cnn-group').select('g.edge-group');
      
      edgeGroup.selectAll(`path.edge-${actPoolDetailViewLayerIndex}-${nodeIndex}`)
        .raise()
        .transition()
        .ease(d3.easeCubicInOut)
        .duration(400)
        .style('stroke', edgeHoverColor)
        .style('stroke-width', '1')
        .style('opacity', 1);
      
      // Highlight its border
      d3.select(g[i]).select('rect.bounding')
        .classed('hidden', false);
      
      // Highlight node's pair
      let associatedLayerIndex = layerIndex - 1;
      if (layerIndex === actPoolDetailViewLayerIndex - 1) {
        associatedLayerIndex = layerIndex + 1;
      }
  
      svg.select(`g#layer-${associatedLayerIndex}-node-${nodeIndex}`)
        .select('rect.bounding')
        .classed('hidden', false);
    }
  
    const actPoolDetailViewPreNodeMouseLeaveHandler = (d, i, g) => {
      // De-highlight the edges
      let layerIndex = layerIndexDict[d.layerName];
      let nodeIndex = d.index;
      let edgeGroup = svg.select('g.cnn-group').select('g.edge-group');
  
      edgeGroup.selectAll(`path.edge-${actPoolDetailViewLayerIndex}-${nodeIndex}`)
        .transition()
        .ease(d3.easeCubicOut)
        .duration(200)
        .style('stroke', edgeInitColor)
        .style('stroke-width', edgeStrokeWidth)
        .style('opacity', edgeOpacity);
      
      // De-highlight its border
      d3.select(g[i]).select('rect.bounding')
        .classed('hidden', true);
      
      // De-highlight node's pair
      let associatedLayerIndex = layerIndex - 1;
      if (layerIndex === actPoolDetailViewLayerIndex - 1) {
        associatedLayerIndex = layerIndex + 1;
      }
  
      svg.select(`g#layer-${associatedLayerIndex}-node-${nodeIndex}`)
        .select('rect.bounding')
        .classed('hidden', true);
    }
  
    const actPoolDetailViewPreNodeClickHandler = (d, i, g) => {
      let layerIndex = layerIndexDict[d.layerName];
      let nodeIndex = d.index;
  
      // Click the pre-layer node in detail view has the same effect as clicking
      // the cur-layer node, which is to open a new detail view window
      svg.select(`g#layer-${layerIndex + 1}-node-${nodeIndex}`)
        .node()
        .dispatchEvent(new Event('click'));
    }
  
    const enterDetailView = (curLayerIndex, i) => {
      isInActPoolDetailView = true;
      actPoolDetailViewNodeIndex = i;
      actPoolDetailViewLayerIndex = curLayerIndex;
  
      // Dynamically position the detail view
      let wholeSvg = d3.select('#copycat-cnn-svg');
      let wholeSvgOracle = d3.select('#cnn-svg');
      let svgYMid = +wholeSvg.style('height').replace('px', '') / 2;
      let svgYOracle = +wholeSvgOracle.style('height').replace('px', '');
      let svgWidth = +wholeSvg.style('width').replace('px', '');
      let copycatdetailViewTop = 100 + svgYMid + svgYOracle - 260 / 2;
  
      let posX = 0;
      if (curLayerIndex > 5) {
        posX = nodeCoordinate[curLayerIndex - 1][0].x + 50;
        posX = posX / 2 - 500 / 2;
      } else {
        posX = (svgWidth - nodeCoordinate[curLayerIndex][0].x - nodeLength) / 2;
        posX = nodeCoordinate[curLayerIndex][0].x + nodeLength + posX - 500 / 2;
  
      }
  
      const copycatdetailview = document.getElementById('copycatdetailview');
      copycatdetailview.style.top = `${copycatdetailViewTop}px`;
      copycatdetailview.style.left = `${posX}px`;
      copycatdetailview.style.position = 'absolute';
  
      // Hide all edges
      let unimportantEdges = svg.select('g.edge-group')
        .selectAll('.edge')
        .filter(d => {
          return d.targetLayerIndex !== curLayerIndex;
        })
        .style('visibility', 'hidden');
      
      // Disable UI
      disableControl = true;
      
      // Hide input annotaitons
      svg.select('.input-annotation')
        .classed('hidden', true);
  
      // Hide copycatlegends
      svg.selectAll(`.${selectedScaleLevel}-copycatlegend`)
        .classed('hidden', true);
      svg.selectAll('.input-copycatlegend').classed('hidden', true);
      svg.selectAll('.output-copycatlegend').classed('hidden', true);
      svg.select(`#${layerLegendDict[curLayerIndex][selectedScaleLevel]}`)
        .classed('hidden', false);
  
      // Add overlay rects
      let leftX = nodeCoordinate[curLayerIndex - 1][i].x;
      // +5 to cover the detailed mode long label
      let rightStart = nodeCoordinate[curLayerIndex][i].x + nodeLength + 5;
  
      // Compute the left and right overlay rect width
      let rightWidth = width - rightStart - overlayRectOffset / 2;
      let leftWidth = leftX - nodeCoordinate[0][0].x;
  
      // The overlay rects should be symmetric
      if (rightWidth > leftWidth) {
        let stops = [{offset: '0%', color: 'rgb(250, 250, 250)', opacity: 0.85},
          {offset: '50%', color: 'rgb(250, 250, 250)', opacity: 0.9},
          {offset: '100%', color: 'rgb(250, 250, 250)', opacity: 1}];
        copycat_addOverlayGradient('overlay-gradient-right', stops);
        
        let leftEndOpacity = 0.85 + (0.95 - 0.85) * (leftWidth / rightWidth);
        stops = [{offset: '0%', color: 'rgb(250, 250, 250)', opacity: leftEndOpacity},
          {offset: '100%', color: 'rgb(250, 250, 250)', opacity: 0.85}];
        copycat_addOverlayGradient('overlay-gradient-left', stops);
      } else {
        let stops = [{offset: '0%', color: 'rgb(250, 250, 250)', opacity: 1},
          {offset: '50%', color: 'rgb(250, 250, 250)', opacity: 0.9},
          {offset: '100%', color: 'rgb(250, 250, 250)', opacity: 0.85}];
        copycat_addOverlayGradient('overlay-gradient-left', stops);
  
        let rightEndOpacity = 0.85 + (0.95 - 0.85) * (rightWidth / leftWidth);
        stops = [{offset: '0%', color: 'rgb(250, 250, 250)', opacity: 0.85},
          {offset: '100%', color: 'rgb(250, 250, 250)', opacity: rightEndOpacity}];
        copycat_addOverlayGradient('overlay-gradient-right', stops);
      }
      
      copycat_addOverlayRect('overlay-gradient-right',
        rightStart + overlayRectOffset / 2 + 0.5,
        0, rightWidth, height + svgPaddings.top);
      
      copycat_addOverlayRect('overlay-gradient-left',
        nodeCoordinate[0][0].x - overlayRectOffset / 2,
        0, leftWidth, height + svgPaddings.top);
  
      svg.selectAll('rect.overlay')
        .on('click', emptySpaceClicked);
      
      // Add underneath rectangles
      let underGroup = svg.select('g.underneath');
      let padding = 7;
      for (let n = 0; n < cnn[curLayerIndex - 1].length; n++) {
        underGroup.append('rect')
          .attr('class', 'underneath-gateway')
          .attr('id', `underneath-gateway-${n}`)
          .attr('x', nodeCoordinate[curLayerIndex - 1][n].x - padding)
          .attr('y', nodeCoordinate[curLayerIndex - 1][n].y - padding)
          .attr('width', (2 * nodeLength + hSpaceAroundGap) + 2 * padding)
          .attr('height', nodeLength + 2 * padding)
          .attr('rx', 10)
          .style('fill', 'rgba(160, 160, 160, 0.3)')
          .style('opacity', 0);
        
        // Update the event functions for these two layers
        svg.select(`g#layer-${curLayerIndex - 1}-node-${n}`)
          .style('pointer-events', 'all')
          .style('cursor', 'pointer')
          .on('mouseover', actPoolDetailViewPreNodeMouseOverHandler)
          .on('mouseleave', actPoolDetailViewPreNodeMouseLeaveHandler)
          .on('click', actPoolDetailViewPreNodeClickHandler);
      }
      underGroup.lower();
  
      // Highlight the selcted pair
      underGroup.select(`#underneath-gateway-${i}`)
        .style('opacity', 1);
    }
  
    const quitIntermediateView = (curLayerIndex, g, i) => {
      // If it is the softmax detail view, quit that view first
      if (isInSoftmax) {
        svg.select('.logit-layer').remove();
        svg.select('.logit-layer-lower').remove();
        svg.selectAll('.plus-symbol-clone').remove();
  
        // Instead of removing the paths, we hide them, so it is faster to load in
        // the future
        svg.select('.underneath')
          .selectAll('.logit-lower')
          .style('opacity', 0);
  
        copycat_softmaxDetailViewStore.set({
            show: false,
            logits: []
        })
  
        copycat_allowsSoftmaxAnimationStore.set(false);
      }
      copycat_isInSoftmaxStore.set(false);
      isInIntermediateView = false;
  
      // Show the copycatlegend
      svg.selectAll(`.${selectedScaleLevel}-copycatlegend`)
        .classed('hidden', !detailedMode);
      svg.selectAll('.input-copycatlegend').classed('hidden', !detailedMode);
      svg.selectAll('.output-copycatlegend').classed('hidden', !detailedMode);
  
      // Recover control panel UI
      disableControl = false;
  
      // Recover the input layer node's event
      for (let n = 0; n < cnn[curLayerIndex - 1].length; n++) {
        svg.select(`g#layer-${curLayerIndex - 1}-node-${n}`)
          .on('mouseover', nodeMouseOverHandler)
          .on('mouseleave', nodeMouseLeaveHandler)
          .on('click', nodeClickHandler);
      }
  
      // Clean up the underneath rects
      svg.select('g.underneath')
        .selectAll('rect')
        .remove();
      detailedViewNum = undefined;
  
      // Highlight the previous layer and this node
      svg.select(`g#cnn-layer-group-${curLayerIndex - 1}`)
        .selectAll('rect.bounding')
        .style('stroke-width', 1);
      
      d3.select(g[i])
        .select('rect.bounding')
        .style('stroke-width', 1);
  
      // Highlight the labels
      svg.selectAll(`g#layer-label-${curLayerIndex - 1},
        g#layer-detailed-label-${curLayerIndex - 1},
        g#layer-label-${curLayerIndex},
        g#layer-detailed-label-${curLayerIndex}`)
        .style('font-weight', 'normal');
  
      // Also unclick the node
      // Record the current clicked node
      selectedNode.layerName = '';
      selectedNode.index = -1;
      selectedNode.data = null;
      isExitedFromCollapse = true;
  
      // Remove the intermediate layer
      let intermediateLayer = svg.select('g.copycat-intermediate-layer');
  
      // Kill the infinite animation loop
      copycat_shouldIntermediateAnimateStore.set(false);
  
      intermediateLayer.transition('remove')
        .duration(500)
        .ease(d3.easeCubicInOut)
        .style('opacity', 0)
        .on('end', (d, i, g) => { d3.select(g[i]).remove()});
      
      // Remove the output node overlay mask
      svg.selectAll('.overlay-group').remove();
      
      // Remove the overlay rect
      svg.selectAll('g.copycat-intermediate-layer-overlay, g.copycat-intermediate-layer-annotation')
        .transition('remove')
        .duration(500)
        .ease(d3.easeCubicInOut)
        .style('opacity', 0)
        .on('end', (d, i, g) => {
          svg.selectAll('g.copycat-intermediate-layer-overlay, g.copycat-intermediate-layer-annotation').remove();
          svg.selectAll('defs.overlay-gradient').remove();
        });
      
      // Recover the layer if we have drdrawn it
      if (needRedraw[0] !== undefined) {
        let redrawRange = cnnLayerRanges[selectedScaleLevel][needRedraw[0]];
        if (needRedraw[1] !== undefined) {
          svg.select(`g#layer-${needRedraw[0]}-node-${needRedraw[1]}`)
            .select('image.node-image')
            .each((d, i, g) => copycat_drawOutput(d, i, g, redrawRange));
        } else {
          svg.select(`g#cnn-layer-group-${needRedraw[0]}`)
            .selectAll('image.node-image')
            .each((d, i, g) => copycat_drawOutput(d, i, g, redrawRange));
        }
      }
      
      // Move all layers to their original place
      for (let i = 0; i < numLayers; i++) {
        copycat_moveLayerX({layerIndex: i, targetX: nodeCoordinate[i][0].x,
          disable:false, delay:500, opacity: 1});
      }
  
      copycat_moveLayerX({layerIndex: numLayers - 2,
        targetX: nodeCoordinate[numLayers - 2][0].x, opacity: 1,
        disable:false, delay:500, onEndFunc: () => {
          // Show all edges on the last moving animation end
          svg.select('g.edge-group')
            .style('visibility', 'visible');
  
          // Recover the input annotation
          svg.select('.input-annotation')
            .classed('hidden', false);
        }});
    }
  
    const nodeClickHandler = (d, i, g) => {
      d3.event.stopPropagation();
      let nodeIndex = d.index;
  
      // Record the current clicked node
      selectedNode.layerName = d.layerName;
      selectedNode.index = d.index;
      selectedNode.data = d;
      selectedNode.domI = i;
      selectedNode.domG = g;
  
      // Record data for detailed view.
      if (d.type === 'conv' || d.type === 'relu' || d.type === 'pool') {
        let data = [];
        for (let j = 0; j < d.inputLinks.length; j++) {
          data.push({
            input: d.inputLinks[j].source.output,
            kernel: d.inputLinks[j].weight,
            output: d.inputLinks[j].dest.output,
          })
        }
        let curLayerIndex = layerIndexDict[d.layerName];
        data.colorRange = cnnLayerRanges[selectedScaleLevel][curLayerIndex];
        data.isInputInputLayer = curLayerIndex <= 1;
        nodeData = data;
      }
  
      let curLayerIndex = layerIndexDict[d.layerName];
  
      if (d.type == 'relu' || d.type == 'pool') {
        isExitedFromDetailedView = false;
        if (!isInActPoolDetailView) {
          // Enter the act pool detail view
          enterDetailView(curLayerIndex, d.index);
        } else {
          if (d.index === actPoolDetailViewNodeIndex) {
            // Quit the act pool detail view
            quitActPoolDetailView();
          } else {
            // Switch the detail view input to the new clicked pair
  
            // Remove the previous selection effect
            svg.select(`g#layer-${curLayerIndex}-node-${actPoolDetailViewNodeIndex}`)
              .select('rect.bounding')
              .classed('hidden', true);
  
            svg.select(`g#layer-${curLayerIndex - 1}-node-${actPoolDetailViewNodeIndex}`)
              .select('rect.bounding')
              .classed('hidden', true);
            
            let edgeGroup = svg.select('g.cnn-group').select('g.edge-group');
        
            edgeGroup.selectAll(`path.edge-${curLayerIndex}-${actPoolDetailViewNodeIndex}`)
              .transition()
              .ease(d3.easeCubicOut)
              .duration(200)
              .style('stroke', edgeInitColor)
              .style('stroke-width', edgeStrokeWidth)
              .style('opacity', edgeOpacity);
            
            let underGroup = svg.select('g.underneath');
            underGroup.select(`#underneath-gateway-${actPoolDetailViewNodeIndex}`)
              .style('opacity', 0);
          
            // Add selection effect on the new selected pair
            svg.select(`g#layer-${curLayerIndex}-node-${nodeIndex}`)
              .select('rect.bounding')
              .classed('hidden', false);
  
            svg.select(`g#layer-${curLayerIndex - 1}-node-${nodeIndex}`)
              .select('rect.bounding')
              .classed('hidden', false);
  
            edgeGroup.selectAll(`path.edge-${curLayerIndex}-${nodeIndex}`)
              .raise()
              .transition()
              .ease(d3.easeCubicInOut)
              .duration(400)
              .style('stroke', edgeHoverColor)
              .style('stroke-width', '1')
              .style('opacity', 1);
  
            underGroup.select(`#underneath-gateway-${nodeIndex}`)
              .style('opacity', 1);
  
            actPoolDetailViewNodeIndex = nodeIndex;
          }
        }
      }
  
      // Enter the second view (layer-view) when user clicks a conv node
      if ((d.type === 'conv' || d.layerName === 'output') && !isInIntermediateView) {
        prepareToEnterIntermediateView(d, g, nodeIndex, curLayerIndex);
  
        if (d.layerName === 'conv_1_1') {
          copycat_drawConv1(curLayerIndex, d, nodeIndex, width, height,
            intermediateNodeMouseOverHandler, intermediateNodeMouseLeaveHandler,
            intermediateNodeClicked);
        }
  
        else if (d.layerName === 'conv_1_2') {
          copycat_drawConv2(curLayerIndex, d, nodeIndex, width, height,
            intermediateNodeMouseOverHandler, intermediateNodeMouseLeaveHandler,
            intermediateNodeClicked);
        }
  
        else if (d.layerName === 'conv_2_1') {
          copycat_drawConv3(curLayerIndex, d, nodeIndex, width, height,
            intermediateNodeMouseOverHandler, intermediateNodeMouseLeaveHandler,
            intermediateNodeClicked);
        }
        
        else if (d.layerName === 'conv_2_2') {
          copycat_drawConv4(curLayerIndex, d, nodeIndex, width, height,
            intermediateNodeMouseOverHandler, intermediateNodeMouseLeaveHandler,
            intermediateNodeClicked);
        }
      
        else if (d.layerName === 'output') {
          copycat_drawFlatten(curLayerIndex, d, nodeIndex, width, height);
        }
      }
      // Quit the layerview
      else if ((d.type === 'conv' || d.layerName === 'output') && isInIntermediateView) {
        quitIntermediateView(curLayerIndex, g, i);
      }
    }
  
    const nodeMouseOverHandler = (d, i, g) => {
      // if (isInIntermediateView || isInActPoolDetailView) { return; }
      if (isInIntermediateView) { return; }
  
      // Highlight the edges
      let layerIndex = layerIndexDict[d.layerName];
      let nodeIndex = d.index;
      let edgeGroup = svg.select('g.cnn-group').select('g.edge-group');
      
      edgeGroup.selectAll(`path.edge-${layerIndex}-${nodeIndex}`)
        .raise()
        .transition()
        .ease(d3.easeCubicInOut)
        .duration(400)
        .style('stroke', edgeHoverColor)
        .style('stroke-width', '1')
        .style('opacity', 1);
      
      // Highlight its border
      d3.select(g[i]).select('rect.bounding')
        .classed('hidden', false);
      
      // Highlight source's border
      if (d.inputLinks.length === 1) {
        let link = d.inputLinks[0];
        let layerIndex = layerIndexDict[link.source.layerName];
        let nodeIndex = link.source.index;
        svg.select(`g#layer-${layerIndex}-node-${nodeIndex}`)
          .select('rect.bounding')
          .classed('hidden', false);
      } else {
        svg.select(`g#cnn-layer-group-${layerIndex - 1}`)
          .selectAll('g.node-group')
          .selectAll('rect.bounding')
          .classed('hidden', false);
      }
  
      // Highlight the output text
      if (d.layerName === 'output') {
        d3.select(g[i])
          .select('.output-text')
          .style('opacity', 0.8)
          .style('text-decoration', 'underline');
      }
  
      /* Use the following commented code if we have non-linear model
      d.inputLinks.forEach(link => {
        let layerIndex = layerIndexDict[link.source.layerName];
        let nodeIndex = link.source.index;
        svg.select(`g#layer-${layerIndex}-node-${nodeIndex}`)
          .select('rect.bounding')
          .classed('hidden', false);
      });
      */
    }
  
    const nodeMouseLeaveHandler = (d, i, g) => {
      // Screenshot
      // return;
  
      if (isInIntermediateView) { return; }
      
      // Keep the highlight if user has clicked
      if (isInActPoolDetailView || (
        d.layerName !== selectedNode.layerName ||
        d.index !== selectedNode.index)){
        let layerIndex = layerIndexDict[d.layerName];
        let nodeIndex = d.index;
        let edgeGroup = svg.select('g.cnn-group').select('g.edge-group');
        
        edgeGroup.selectAll(`path.edge-${layerIndex}-${nodeIndex}`)
          .transition()
          .ease(d3.easeCubicOut)
          .duration(200)
          .style('stroke', edgeInitColor)
          .style('stroke-width', edgeStrokeWidth)
          .style('opacity', edgeOpacity);
  
        d3.select(g[i]).select('rect.bounding').classed('hidden', true);
  
        if (d.inputLinks.length === 1) {
          let link = d.inputLinks[0];
          let layerIndex = layerIndexDict[link.source.layerName];
          let nodeIndex = link.source.index;
          svg.select(`g#layer-${layerIndex}-node-${nodeIndex}`)
            .select('rect.bounding')
            .classed('hidden', true);
        } else {
          svg.select(`g#cnn-layer-group-${layerIndex - 1}`)
            .selectAll('g.node-group')
            .selectAll('rect.bounding')
            .classed('hidden', d => d.layerName !== selectedNode.layerName ||
              d.index !== selectedNode.index);
        }
  
        // Dehighlight the output text
        if (d.layerName === 'output') {
          d3.select(g[i])
            .select('.output-text')
            .style('fill', 'black')
            .style('opacity', 0.5)
            .style('text-decoration', 'none');
        }
  
        /* Use the following commented code if we have non-linear model
        d.inputLinks.forEach(link => {
          let layerIndex = layerIndexDict[link.source.layerName];
          let nodeIndex = link.source.index;
          svg.select(`g#layer-${layerIndex}-node-${nodeIndex}`)
            .select('rect.bounding')
            .classed('hidden', true);
        });
        */
      }
    }
    let logits = [-4.28, 2.96, -0.38, 5.24, -7.56, -3.43, 8.63, 2.63, 6.30, 0.68];
    let selectedI = 4;
  
    onMount(async () => {
      // Create SVG
      wholeSvg = d3.select(overviewComponent)
        .select('#copycat-cnn-svg');
      svg = wholeSvg.append('g')
        .attr('class', 'main-svg')
        .attr('transform', `translate(${svgPaddings.left}, 0)`);
      copycat_svgStore.set(svg);
  
      width = Number(wholeSvg.style('width').replace('px', '')) -
        svgPaddings.left - svgPaddings.right;
      height = Number(wholeSvg.style('height').replace('px', '')) -
        svgPaddings.top - svgPaddings.bottom;
  
      let cnnGroup = svg.append('g')
        .attr('class', 'cnn-group');
      
      let underGroup = svg.append('g')
        .attr('class', 'underneath');
  
      let svgYMid = +wholeSvg.style('height').replace('px', '') / 2;
      detailedViewAbsCoords = {
        1 : [600, 100 + svgYMid - 220 / 2, 490, 290],
        2: [500, 100 + svgYMid - 220 / 2, 490, 290],
        3 : [700, 100 + svgYMid - 220 / 2, 490, 290],
        4: [600, 100 + svgYMid - 220 / 2, 490, 290],
        5: [650, 100 + svgYMid - 220 / 2, 490, 290],
        6 : [850, 100 + svgYMid - 220 / 2, 490, 290],
        7 : [100, 100 + svgYMid - 220 / 2, 490, 290],
        8 : [60, 100 + svgYMid - 220 / 2, 490, 290],
        9 : [200, 100 + svgYMid - 220 / 2, 490, 290],
        10 : [300, 100 + svgYMid - 220 / 2, 490, 290],
      }
      
      // Define global arrow marker end
      svg.append("defs")
        .append("marker")
        .attr("id", 'marker')
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 6)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .style('stroke-width', 1.2)
        .style('fill', 'gray')
        .style('stroke', 'gray')
        .attr("d", "M0,-5L10,0L0,5");
  
      // Alternative arrow head style for non-interactive annotation
      svg.append("defs")
        .append("marker")
        .attr("id", 'marker-alt')
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 6)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .style('fill', 'none')
        .style('stroke', 'gray')
        .style('stroke-width', 2)
        .attr("d", "M-5,-10L10,0L-5,10");
      
      console.time('Construct cnn');
      model = await loadTrainedModel('PUBLIC_URL/assets/data/model.json');
      cnn = await constructCNN(`PUBLIC_URL/assets/img/${selectedImage}`, model);
      console.timeEnd('Construct cnn');
      copycat_cnnStore.set(cnn);
  
      // Ignore the flatten layer for now
      let flatten = cnn[cnn.length - 2];
      cnn.splice(cnn.length - 2, 1);
      cnn.flatten = flatten;
      console.log(cnn);
  
      copycat_copycat_updateCNNLayerRanges();
  
      // Create and draw the CNN view
      copycat_drawCNN(width, height, cnnGroup, nodeMouseOverHandler,
        nodeMouseLeaveHandler, nodeClickHandler);
    })
  
    const detailedButtonClicked = () => {
      detailedMode = !detailedMode;
      copycat_detailedModeStore.set(detailedMode);
  
      if (!isInIntermediateView){
        // Show the copycatlegend
        svg.selectAll(`.${selectedScaleLevel}-copycatlegend`)
          .classed('hidden', !detailedMode);
        
        svg.selectAll('.input-copycatlegend').classed('hidden', !detailedMode);
        svg.selectAll('.output-copycatlegend').classed('hidden', !detailedMode);
      }
      
      // Switch the layer name
      svg.selectAll('.layer-detailed-label')
        .classed('hidden', !detailedMode);
      
      svg.selectAll('.layer-label')
        .classed('hidden', detailedMode);
    }
  
    const imageOptionClicked = async (e) => {
      let newImageName = d3.select(e.target).attr('data-imageName');
  
      if (newImageName !== selectedImage) {
        selectedImage = newImageName;
  
        // Re-compute the CNN using the new input image
        cnn = await constructCNN(`PUBLIC_URL/assets/img/${selectedImage}`, model);
  
        // Ignore the flatten layer for now
        let flatten = cnn[cnn.length - 2];
        cnn.splice(cnn.length - 2, 1);
        cnn.flatten = flatten;
        copycat_cnnStore.set(cnn);
  
        // Update all scales used in the CNN view
        copycat_copycat_updateCNNLayerRanges();
        copycat_updateCNN();
      }
    }
  
    const customImageClicked = () => {
  
      // Case 1: there is no custom image -> show the modal to get user input
      if (customImageURL === null) {
        modalInfo.show = true;
        modalInfo.preImage = selectedImage;
        copycat_modalStore.set(modalInfo);
      }
  
      // Case 2: there is an existing custom image, not the focus -> switch to this image
      else if (selectedImage !== 'custom') {
        let fakeEvent = {detail: {url: customImageURL}};
        handleCustomImage(fakeEvent);
      }
  
      // Case 3: there is an existing custom image, and its the focus -> let user
      // upload a new image
      else {
        modalInfo.show = true;
        modalInfo.preImage = selectedImage;
        copycat_modalStore.set(modalInfo);
      }
  
      if (selectedImage !== 'custom') {
        selectedImage = 'custom';
      }
  
    }
  
    const handleModalCanceled = (event) => {
      // User cancels the modal without a successful image, so we restore the
      // previous selected image as input
      selectedImage = event.detail.preImage;
    }
  
    const handleCustomImage = async (event) => {
      // User gives a valid image URL
      customImageURL = event.detail.url;
  
      // Re-compute the CNN using the new input image
      cnn = await constructCNN(customImageURL, model);
  
      // Ignore the flatten layer for now
      let flatten = cnn[cnn.length - 2];
      cnn.splice(cnn.length - 2, 1);
      cnn.flatten = flatten;
      copycat_cnnStore.set(cnn);
  
      // Update the UI
      let customImageSlot = d3.select(overviewComponent)
        .select('.custom-image').node();
      copycat_drawCustomImage(customImageSlot, cnn[0]);
  
      // Update all scales used in the CNN view
      copycat_copycat_updateCNNLayerRanges();
      copycat_updateCNN();
    }
  
    function handleExitFromDetiledConvView(event) {
      if (event.detail.text) {
        detailedViewNum = undefined;
        svg.select(`rect#underneath-gateway-${selectedNodeIndex}`)
          .style('opacity', 0);
        selectedNodeIndex = -1; 
      }
    }
  
    function handleExitFromDetiledPoolView(event) {
      if (event.detail.text) {
        quitActPoolDetailView();
        isExitedFromDetailedView = true;
      }
    }
  
    function handleExitFromDetiledActivationView(event) {
      if (event.detail.text) {
        quitActPoolDetailView();
        isExitedFromDetailedView = true;
      }
    }
  
    function handleExitFromDetiledSoftmaxView(event) {
      softmaxDetailViewInfo.show = false;
      copycat_softmaxDetailViewStore.set(softmaxDetailViewInfo);
    }
  
  </script>
  
  <style>
    .overview {
      padding: 0;
      height: 100%;
      width: 100%;
      display: flex;
      position: relative;
      flex-direction: column;
      justify-content: space-between;
      align-items: flex-start;
    }
  
    .control-container {
      padding: 5px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }
  
    .right-control {
      display: flex;
    }
  
    .left-control {
      display: flex;
      align-items: center;
    }
  
    .control > .select > #copycatlevel-select {
      padding-left: 2em;
      padding-right: 2em;
    }
  
    .cnn {
      width: 100%;
      padding: 0;
      background: var(--light-gray);
      display: flex;
    }
  
    svg {
      margin: 0 auto;
      min-height: 490px;
      max-height: 700px;
      height: calc(100vh - 100px);
      width: 100vw;
    }
  
    .is-very-small {
      font-size: 12px;
    }
  
    #copycatdetailed-button {
      margin-right: 10px;
      color: #dbdbdb;
      transition: border-color 300ms ease-in-out, color 200ms ease-in-out;
    }
  
    #copycatdetailed-button.is-activated, #copycatdetailed-button.is-activated:hover {
      color: #3273dc;
      border-color: #3273dc;
    }
  
    #copycatdetailed-button:hover {
      color: #b5b5b5;
    }
  
    #copycathover-label {
      transition: opacity 300ms ease-in-out;
      text-overflow: ellipsis;
      pointer-events: none;
      margin-left: 5px;
    }
  
    .image-container {
      width: 40px;
      height: 40px;
      border-radius: 4px;
      display: inline-block;
      position: relative;
      border: 2.5px solid #1E1E1E;
      margin-right: 10px;
      cursor: pointer;
      pointer-events: all;
      transition: border 300ms ease-in-out;
    }
  
    .image-container img {
      object-fit: cover;
      max-width: 100%;
      max-height: 100%;
      z-index: -1;
      transition: opacity 300ms ease-in-out;
    }
  
    .image-container.inactive {
      border: 2.5px solid rgb(220, 220, 220);
    }
  
    .image-container.inactive > img {
      opacity: 0.3;
    }
  
    .image-container.inactive:hover > img {
      opacity: 0.6;
    }
  
    .image-container.inactive.disabled {
      border: 2.5px solid rgb(220, 220, 220);
      cursor: not-allowed;
    }
  
    .image-container.inactive.disabled:hover {
      border: 2.5px solid rgb(220, 220, 220);
      cursor: not-allowed;
    }
  
    .image-container.inactive.disabled > img {
      opacity: 0.3;
      cursor: not-allowed;
    }
  
    .image-container.inactive.disabled:hover > img {
      opacity: 0.3;
      cursor: not-allowed;
    }
  
    .image-container.inactive > .edit-icon {
      color: #BABABA;
    }
  
    .image-container.inactive:hover > .edit-icon {
      color: #777777;
    }
  
    .image-container.inactive:hover {
      border: 2.5px solid #1E1E1E;
    }
  
    .edit-icon {
      position: absolute;
      bottom: -6px;
      right: -7px;
      font-size: 7px;
      color: #1E1E1E;
      transition: color 300ms ease-in-out;
    }
  
    :global(canvas) {
      image-rendering: crisp-edges;
    }
  
    :global(.layer-label), :global(.layer-detailed-label), :global(.layer-intermediate-label) {
      font-size: 12px;
      opacity: 0.8;
      text-anchor: middle;
    }
  
    :global(.colorLegend) {
      font-size: 10px;
    }
  
    :global(.copycatlegend) {
      transition: opacity 400ms ease-in-out;
    }
  
    :global(.copycatlegend > rect) {
      opacity: 1;
    }
  
    :global(.copycatlegend text), :global(.copycatlegend line), :global(.copycatlegend path) {
      opacity: 0.7;
    }
  
    :global(.copycatlegend#output-copycatlegend > rect) {
      opacity: 1;
    }
  
    :global(.hidden) {
      opacity: 0;
      pointer-events: none;
    }
  
    :global(.very-strong) {
      stroke-width: 3px;
    }
  
    :global(.bounding), :global(.edge), :global(.edge-group),
    :global(foreignObject), :global(.bounding-flatten),
    :global(.underneath-gateway), :global(.input-annotation) {
      transition: opacity 300ms ease-in-out;
    }
  
    :global(rect.bounding) {
      transition: stroke-width 800ms ease-in-out, opacity 300ms ease-in-out;
    }
  
    :global(.annotation-text) {
      pointer-events: none;
      font-size: 10px;
      font-style: italic;
      fill: gray;
    }
  
    /* Change the cursor style on the detailed view input and output matrices */
    :global(rect.square) {
      cursor: crosshair;
    }
  
    :global(.animation-control-button) {
      font-family: FontAwesome;
      opacity: 0.8;
      cursor: pointer;
    }
  
    .model-name {
      font-size: 23px;
      fill: rgb(255, 255, 255);
      dominant-baseline: baseline;
      font-family: 'Neucha';
      margin-right: 10px;
	  }

  </style>
  
  <div class="overview"
    bind:this={overviewComponent}>
  
    <div class="control-container">
  
      <div class="left-control">
        <span class='model-name'>Copycat Model:</span>
        
        {#each imageOptions as image, i}
          <div class="image-container"
            on:click={disableControl ? () => {} : imageOptionClicked}
            class:inactive={selectedImage !== image.file}
            class:disabled={disableControl}
            data-imageName={image.file}>
            <img src="PUBLIC_URL/assets/img/{image.file}"
              alt="image option"
              title="{image.class}"
              data-imageName={image.file}/>
          </div>
        {/each}
  
        <!-- The plus button -->
          <div class="image-container"
            class:inactive={selectedImage !== 'custom'}
            class:disabled={disableControl}
            data-imageName={'custom'}
            on:click={disableControl ? () => {} : customImageClicked}>
  
            <img class="custom-image"
              src="PUBLIC_URL/assets/img/plus.svg"
              alt="plus button"
              title="Add new input image"
              data-imageName="custom"/>
  
            <span class="fa-stack edit-icon"
              class:hidden={customImageURL === null}>
              <i class="fas fa-circle fa-stack-2x"></i>
              <i class="fas fa-pen fa-stack-1x fa-inverse"></i>
            </span>
  
          </div>
  
        <button class="button is-very-small is-link is-light"
          id="copycathover-label"
          style="opacity:{hoverInfo.show ? 1 : 0}">
          <span class="icon" style="margin-right: 5px;">
            <i class="fas fa-crosshairs "></i>
          </span>
          <span id="copycatcopycathover-label-text">
            {hoverInfo.text}
          </span>
        </button>
      </div>
  
      <div class="right-control">
  
        <button class="button is-very-small"
          id="copycatdetailed-button"
          disabled={disableControl}
          class:is-activated={detailedMode}
          on:click={detailedButtonClicked}>
          <span class="icon">
            <i class="fas fa-eye"></i>
          </span>
          <span id="copycatcopycathover-label-text">
            Show detail
          </span>
        </button>
  
        <div class="control is-very-small has-icons-left"
          title="Change color scale range">
          <span class="icon is-left">
            <i class="fas fa-palette"></i>
          </span>
  
          <div class="select">
            <select bind:value={selectedScaleLevel} id="copycatlevel-select"
              disabled={disableControl}>
              <option value="local">Unit</option>
              <option value="module">Module</option>
              <option value="global">Global</option>
            </select>
          </div>
        </div>
  
      </div>
      
    </div>
  
    <div class="cnn">
      <svg id="copycat-cnn-svg"></svg>
    </div>
  </div>
  
  <div id='copycatdetailview'>
    {#if selectedNode.data && selectedNode.data.type === 'conv' && selectedNodeIndex != -1}
      <ConvolutionView on:message={handleExitFromDetiledConvView} input={nodeData[selectedNodeIndex].input} 
                        kernel={nodeData[selectedNodeIndex].kernel}
                        dataRange={nodeData.colorRange}
                        colorScale={nodeData.inputIsInputLayer ?
                          layerColorScales.input[0] : layerColorScales.conv}
                        isInputInputLayer={nodeData.inputIsInputLayer}
                        isExited={isExitedFromCollapse}/>
    {:else if selectedNode.data && selectedNode.data.type === 'relu'}
      <ActivationView on:message={handleExitFromDetiledActivationView} input={nodeData[0].input} 
                      output={nodeData[0].output}
                      dataRange={nodeData.colorRange}
                      isExited={isExitedFromDetailedView}/>
    {:else if selectedNode.data && selectedNode.data.type === 'pool'}
      <PoolView on:message={handleExitFromDetiledPoolView} input={nodeData[0].input} 
                kernelLength={2}
                dataRange={nodeData.colorRange}
                isExited={isExitedFromDetailedView}/>
    {:else if softmaxDetailViewInfo.show}
      <SoftmaxView logits={softmaxDetailViewInfo.logits}
                   logitColors={softmaxDetailViewInfo.logitColors}
                   selectedI={softmaxDetailViewInfo.selectedI}
                   highlightI={softmaxDetailViewInfo.highlightI}
                   outputName={softmaxDetailViewInfo.outputName}
                   outputValue={softmaxDetailViewInfo.outputValue}
                   startAnimation={softmaxDetailViewInfo.startAnimation}
                   on:xClicked={handleExitFromDetiledSoftmaxView}
                   on:mouseOver={copycat_softmaxDetailViewMouseOverHandler}
                   on:mouseLeave={copycat_softmaxDetailViewMouseLeaveHandler}/>
    {/if}
  </div>
  
  <Modal on:xClicked={handleModalCanceled}
    on:urlTyped={handleCustomImage}/>