# Screen & Webcam Recording Demo with getDisplayMedia & getUserMedia

This demo uses `getDisplayMedia()`, `HTML Canvas` and the `Media Stream Recording API` to record the screen and the camera at the same time.

The screen content and webcam video are drawn onto an HTML5 `<canvas>`, which is then recorded using a `MediaRecorder`. This approach allows us to display your webcam as a picture-in-picture (PiP) overlay while recording the entire screen.

## How It Works
1. When you click "Share Screen + Camera", we use the `getDisplayMedia()` API to capture your screen and `getUserMedia()` to access your webcam and microphone.
2. Both video sources are drawn onto an HTML5 `<canvas>` element. The webcam feed is positioned as an overlay in the corner.
3. The canvas content is captured and recorded using the MediaRecorder API into a downloadable WebM file.

## Works on
* Chrome 74 and up
* Edge 79 and up
* Firefox 66 and up
* Opera 60 and up

## Links
* [Live demo of this code](https://addpipe.com/get-display-media-with-cam-demo/)
* [Blog post](https://blog.addpipe.com/recording-the-webcam-and-screen-same-time/)
