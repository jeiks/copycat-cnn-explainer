<script>
	  import Youtube from './Youtube.svelte';
    let currentPlayer;
</script>

<style>
	#description {
    margin-bottom: 60px;
    margin-left: auto;
    margin-right: auto;
    max-width: 80%;
  }

  #description h2 {
    color: #444;
    font-size: 40px;
    font-weight: 450;
    margin-bottom: 12px;
    margin-top: 60px;
  }

  #description h4 {
    color: #444;
    font-size: 32px;
    font-weight: 450;
    margin-bottom: 8px;
    margin-top: 44px;
  }

  #description h6 {
    color: #444;
    font-size: 24px;
    font-weight: 450;
    margin-bottom: 8px;
    margin-top: 44px;
  }

  #description p {
    margin: 16px 0;
  }

  #description p img {
    vertical-align: middle;
  }

  #description .figure-caption {
    font-size: 13px;
    margin-top: 5px;
  }

  #description ol {
    margin-left: 40px;
  }

  #description p, 
  #description div,
  #description li {
    color: #555;
    font-size: 17px;
    line-height: 1.6;
  }

  #description small {
    font-size: 12px;
  }

  #description ol li img {
    vertical-align: middle;
  }

  #description .video-link {
    color: #3273DC;
    cursor: pointer;
    font-weight: normal;
    text-decoration: none;
  }

  #description ul {
      list-style-type: disc;
      margin-top: -10px;
      margin-left: 40px;
      margin-bottom: 15px;
  }
    
  #description a:hover, 
  #description .video-link:hover {
    text-decoration: underline;
  }

  .figure, .video {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
</style>

<body>
  <div id="description">
    <h2>Oracle and Copycat models: an interactive visualization</h2>
    <p>
        The <a href='https://poloclub.github.io/cnn-explainer/'>CNN Explainer</a> is a great tool that provides interactive visualization of a CNN model using "JavaScript".
        It runs on GitHub and uses TensorFlowJS, Svelte and D3.js (more information bellow).
        Taking advantage of it, we are using their project to provide an interactive visualization of an Oracle and a Copycat models.
        We want you to better understand our research by visualizing the behavior of Oracle and Copycat models, interacting with their parameters and comparing them with each other.
    </p>
    <h2>Interactive features</h2>
    <ol>
    	<li><strong>Upload your own image</strong> by selecting <img class="icon is-rounded" src="PUBLIC_URL/assets/figures/upload_image_icon.png" alt="upload image icon"/> to understand how your image is classified into the 10 classes.  By analyzing the neurons throughout the network, you can understand the activations maps and extracted features.</li>
    	<li><strong>Change the activation map colorscale</strong> to better understand the impact of activations at different levels of abstraction by adjusting <img class="is-rounded" width="100px" src="PUBLIC_URL/assets/figures/heatmap_scale.png" alt="heatmap"/>.</li>
    	<li><strong>Understand network details</strong> such as layer dimensions and colorscales by clicking the <img class="is-rounded" width="100px" src="PUBLIC_URL/assets/figures/network_details.png" alt="network details icon"/> icon.</li>
    	<li><strong>Simulate network operations</strong> by clicking the <img class="icon is-rounded" src="PUBLIC_URL/assets/figures/play_button.png" alt="play icon"/> button or interact with the layer slice in the <em>Interactive Formula View</em> by hovering over portions of the input or output to understand the mappings and underlying operations.</li>
      <li><strong>Learn layer functions</strong> by clicking <img class="icon is-rounded" src="PUBLIC_URL/assets/figures/info_button.png" alt="info icon"/> from the <em>Interactive Formula View</em> to read layer details from the article.</li>
    </ol> 

    <h2>Video Tutorial</h2>
    <p>This page was based on <a href='https://poloclub.github.io/cnn-explainer/'>CNN Explainer</a>. You can see their tutorial to understand how to interact with the CNN model.</p>
    <div class="video">
      <Youtube videoId="HnWIHWFbuUQ" playerId="demo_video" bind:this={currentPlayer}/>
    </div>

    <h2>More information</h2>
    <p>
       The network architecture is Tiny-VGG (it is a small model, allowing to display its parameters) and was implemented in TensorFlow.
       Based on <a href='https://github.com/poloclub/cnn-explainer/tree/master/tiny-vgg'>cnn-explainer</a> code, we developed the Copycat method to run against their model.
       This site has also been adapted to show both models at the same time and provide the user a way to compare them.
    </p>
    <p>
       The models were obtained in our experiments. The Oracle and Copycat accuracies on the test dataset were 66% and 61% respectively (Copycat performance: 92%).
       After training, they were exported to TensorFlowJS and are fully running in your browser :D
    </p>
    <p>
      From their <a href='https://poloclub.github.io/cnn-explainer/'>website</a>:
      "<i>CNN Explainer uses <a href='https://js.tensorflow.org/'>TensorFlow.js</a>, an in-browser GPU-accelerated deep learning library to load the pretrained model for visualization.
      It was necessary TensorFlowJS for exporting the model, <a href='https://svelte.dev/'>Svelte</a> as a framework and <a href='https://d3js.org/'>D3.js</a> for visualizations.</i>"
    </p>
  </div>
</body>
