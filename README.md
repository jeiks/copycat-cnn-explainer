# Copycat CNN Explainer

The [CNN Explainer](https://github.com/poloclub/cnn-explainer) is an interactive visualization system designed to help non-experts learn about Convolutional Neural Networks (CNNs).

And it was used by our team to provide a interactive comparison between Oracle and [Copycat](https://github.com/jeiks/Stealing_DL_Models) models.

## Live Visualization

To access the interactive visualization, visit: [http://www.jeiks.net/copycat-cnn-explainer/](http://www.jeiks.net/copycat-cnn-explainer/)
<br>Please use your computer, because interactive viewing is not that good on smartphones

## Running Locally

Clone or download this repository:

```bash
git clone git@github.com:jeiks/copycat-cnn-explainer.git

# use degit if you don't want to download commit histories
degit jeiks/cnn-explainer
```

Install the dependencies:

```bash
npm install
```

Then run CNN Explainer:

```bash
cd public
ln -s . copycat-cnn-explainer
cd ..
npm run dev
```

Navigate to [localhost:5000](https://localhost:5000). You should see Copycat CNN Explainer running in your broswer :)

To see how we trained the CNN, visit the directory [`./tiny-vgg/`](tiny-vgg).
