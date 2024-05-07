"use strict";

var constraints = { video: true, audio: true };

var shareBtn = document.querySelector("button#shareScreen");
var recBtn = document.querySelector("button#rec");
var stopBtn = document.querySelector("button#stop");

const videoElement = {
  bigVideo: document.getElementById("bigVideo"),
  smallVideo: document.getElementById("smallVideo"),
};
const recordingCanvas = document.getElementById("recordingCanvas");
const ctx = recordingCanvas.getContext("2d");

var dataElement = document.querySelector("#data");
var downloadLink = document.querySelector("a#downloadLink");

var mediaRecorder;
var chunks = [];
var count = 0;
var localStream = null;
var soundMeter = null;
var micNumber = 0;

const captureProcessed = () => {
  // Get audio from stream
  const audioTrack = localStream.getAudioTracks()[0];

  // Create a new canvas capture stream for the video
  const canvasVideoStream = recordingCanvas.captureStream(30);

  // Combine the audio track and the canvas video stream into a new MediaStream
  const combinedStream = new MediaStream();
  combinedStream.addTrack(audioTrack);
  combinedStream.addTrack(canvasVideoStream.getVideoTracks()[0]);

  // Reassign localStream to capture the processed stream
  localStream = combinedStream;

  console.log("Canvas stream captured successfully:", localStream);
};

const captureOnCanvas = () => {
  // Set canvas dimensions to match big video
  recordingCanvas.width = videoElement.bigVideo.offsetWidth;
  recordingCanvas.height = videoElement.bigVideo.offsetHeight;

  const xSmall =
    recordingCanvas.width - videoElement.smallVideo.offsetWidth - 20;
  const ySmall =
    recordingCanvas.height - videoElement.smallVideo.offsetHeight - 20;

  const drawEachFrame = () => {
    // Draw both videos onto the canvas
    ctx.drawImage(
      videoElement.bigVideo,
      0,
      0,
      recordingCanvas.width,
      recordingCanvas.height
    );
    ctx.drawImage(
      videoElement.smallVideo,
      xSmall,
      ySmall,
      videoElement.smallVideo.offsetWidth,
      videoElement.smallVideo.offsetHeight
    );
    requestAnimationFrame(drawEachFrame);
  };

  drawEachFrame();

  // Capture canvas content as a MediaStream
  captureProcessed();
};

const captureCamera = () => {
  return new Promise((resolve, reject) => {
    // Check if getUserMedia is available
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      // Constraints object to specify the video source
      const constraints = {
        video: true,
        audio: true,
      };

      // Request access to the camera stream
      navigator.mediaDevices
        .getUserMedia(constraints)
        .then(function (stream) {
          // Access the camera stream
          console.log("Camera stream captured successfully:", stream);

          getStreamSuccess(stream, "smallVideo");
          resolve();
        })
        .catch(function (error) {
          console.error("Error accessing camera stream:", error);
          reject();
        });
    } else {
      console.error("getUserMedia is not supported in this browser");
      reject();
    }
  });
};

function onShareScreen() {
  if (!navigator.mediaDevices.getDisplayMedia) {
    alert(
      "navigator.mediaDevices.getDisplayMedia not supported on your browser."
    );
  } else {
    if (window.MediaRecorder == undefined) {
      alert("MediaRecorder not supported on your browser.");
    } else {
      navigator.mediaDevices
        .getDisplayMedia(constraints)
        .then(function (screenStream) {
          //check for microphone
          navigator.mediaDevices
            .enumerateDevices()
            .then(function (devices) {
              devices.forEach(function (device) {
                if (device.kind == "audioinput") {
                  micNumber++;
                }
              });

              if (micNumber == 0) {
                getStreamSuccess(screenStream, "bigVideo");
              } else {
                navigator.mediaDevices
                  .getUserMedia({ audio: true })
                  .then(function (micStream) {
                    var composedStream = new MediaStream();

                    //added the video stream from the screen
                    screenStream
                      .getVideoTracks()
                      .forEach(function (videoTrack) {
                        composedStream.addTrack(videoTrack);
                      });

                    //if system audio has been shared
                    if (screenStream.getAudioTracks().length > 0) {
                      //merge the system audio with the mic audio
                      var context = new AudioContext();
                      var audioDestination =
                        context.createMediaStreamDestination();

                      const systemSource =
                        context.createMediaStreamSource(screenStream);
                      const systemGain = context.createGain();
                      systemGain.gain.value = 1.0;
                      systemSource
                        .connect(systemGain)
                        .connect(audioDestination);
                      console.log("added system audio");

                      if (micStream && micStream.getAudioTracks().length > 0) {
                        const micSource =
                          context.createMediaStreamSource(micStream);
                        const micGain = context.createGain();
                        micGain.gain.value = 1.0;
                        micSource.connect(micGain).connect(audioDestination);
                        console.log("added mic audio");
                      }

                      audioDestination.stream
                        .getAudioTracks()
                        .forEach(function (audioTrack) {
                          composedStream.addTrack(audioTrack);
                        });
                    } else {
                      //add just the mic audio
                      micStream.getAudioTracks().forEach(function (micTrack) {
                        composedStream.addTrack(micTrack);
                      });
                    }

                    getStreamSuccess(composedStream, "bigVideo");
                  })
                  .catch(function (err) {
                    log("navigator.getUserMedia error: " + err);
                  });
              }

              // Capture the webcam
              captureCamera()
                .then(() => {
                  // Draw on canvas and capture stream
                  captureOnCanvas();
                })
                .catch(() => {
                  // Error capturing
                  recBtn.disabled = true;
                  shareBtn.disabled = false;
                });
            })
            .catch(function (err) {
              log(err.name + ": " + err.message);
            });
        })
        .catch(function (err) {
          log("navigator.getDisplayMedia error: " + err);
        });
    }
  }
}

function getStreamSuccess(stream, videoId) {
  if (!videoElement[videoId]) return;
  localStream = stream;
  localStream.getTracks().forEach(function (track) {
    if (track.kind == "audio") {
      track.onended = function () {
        log(
          "audio track.onended Audio track.readyState=" +
            track.readyState +
            ", track.muted=" +
            track.muted
        );
      };
    }
    if (track.kind == "video") {
      track.onended = function () {
        log(
          "video track.onended Audio track.readyState=" +
            track.readyState +
            ", track.muted=" +
            track.muted
        );
      };
    }
  });

  videoElement[videoId].srcObject = localStream;
  videoElement[videoId].play();
  videoElement[videoId].muted = true;
  recBtn.disabled = false;
  shareBtn.disabled = true;

  if (stream.getAudioTracks().length < 1) return;

  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    window.audioContext = new AudioContext();
  } catch (e) {
    log("Web Audio API not supported.");
  }

  soundMeter = window.soundMeter = new SoundMeter(window.audioContext);
  soundMeter.connectToSource(localStream, function (e) {
    if (e) {
      log(e);
      return;
    }
  });
}

function onBtnRecordClicked() {
  if (localStream == null) {
    alert("Could not get local stream from mic/camera");
  } else {
    recBtn.disabled = true;
    stopBtn.disabled = false;

    /* use the stream */
    log("Start recording...");
    mediaRecorder = new MediaRecorder(localStream);

    mediaRecorder.ondataavailable = function (e) {
      chunks.push(e.data);
    };

    mediaRecorder.onerror = function (e) {
      log("mediaRecorder.onerror: " + e);
    };

    mediaRecorder.onstart = function () {
      log(
        "mediaRecorder.onstart, mediaRecorder.state = " + mediaRecorder.state
      );

      localStream.getTracks().forEach(function (track) {
        if (track.kind == "audio") {
          log(
            "onstart - Audio track.readyState=" +
              track.readyState +
              ", track.muted=" +
              track.muted
          );
        }
        if (track.kind == "video") {
          log(
            "onstart - Video track.readyState=" +
              track.readyState +
              ", track.muted=" +
              track.muted
          );
        }
      });
    };

    mediaRecorder.onstop = function () {
      log("mediaRecorder.onstop, mediaRecorder.state = " + mediaRecorder.state);

      var blob = new Blob(chunks, { type: "video/webm" });
      chunks = [];

      var videoURL = window.URL.createObjectURL(blob);
      console.log("Recording Link:", videoURL);

      downloadLink.href = videoURL;
      downloadLink.innerHTML = "Download video file";

      var rand = Math.floor(Math.random() * 10000000);
      var name = "video_" + rand + ".webm";

      downloadLink.setAttribute("download", name);
      downloadLink.setAttribute("name", name);
    };

    mediaRecorder.onwarning = function (e) {
      log("mediaRecorder.onwarning: " + e);
    };

    mediaRecorder.start(10);

    localStream.getTracks().forEach(function (track) {
      log(track.kind + ":" + JSON.stringify(track.getSettings()));
      console.log(track.getSettings());
    });
  }
}

function onBtnStopClicked() {
  mediaRecorder.stop();
  recBtn.disabled = false;
  stopBtn.disabled = true;
}

function onStateClicked() {
  if (mediaRecorder != null && localStream != null && soundMeter != null) {
    log("mediaRecorder.state=" + mediaRecorder.state);
    log("mediaRecorder.mimeType=" + mediaRecorder.mimeType);
    log("mediaRecorder.videoBitsPerSecond=" + mediaRecorder.videoBitsPerSecond);
    log("mediaRecorder.audioBitsPerSecond=" + mediaRecorder.audioBitsPerSecond);

    localStream.getTracks().forEach(function (track) {
      if (track.kind == "audio") {
        log(
          "Audio: track.readyState=" +
            track.readyState +
            ", track.muted=" +
            track.muted
        );
      }
      if (track.kind == "video") {
        log(
          "Video: track.readyState=" +
            track.readyState +
            ", track.muted=" +
            track.muted
        );
      }
    });

    log("Audio activity: " + Math.round(soundMeter.instant.toFixed(2) * 100));
  }
}

function log(message) {
  dataElement.innerHTML = dataElement.innerHTML + "<br>" + message;
  console.log(message);
}

// Meter class that generates a number correlated to audio volume.
// The meter class itself displays nothing, but it makes the
// instantaneous and time-decaying volumes available for inspection.
// It also reports on the fraction of samples that were at or near
// the top of the measurement range.
function SoundMeter(context) {
  this.context = context;
  this.instant = 0.0;
  this.slow = 0.0;
  this.clip = 0.0;
  this.script = context.createScriptProcessor(2048, 1, 1);
  var that = this;
  this.script.onaudioprocess = function (event) {
    var input = event.inputBuffer.getChannelData(0);
    var i;
    var sum = 0.0;
    var clipcount = 0;
    for (i = 0; i < input.length; ++i) {
      sum += input[i] * input[i];
      if (Math.abs(input[i]) > 0.99) {
        clipcount += 1;
      }
    }
    that.instant = Math.sqrt(sum / input.length);
    that.slow = 0.95 * that.slow + 0.05 * that.instant;
    that.clip = clipcount / input.length;
  };
}

SoundMeter.prototype.connectToSource = function (stream, callback) {
  console.log("SoundMeter connecting");
  try {
    this.mic = this.context.createMediaStreamSource(stream);
    this.mic.connect(this.script);
    // necessary to make sample run, but should not be.
    this.script.connect(this.context.destination);
    if (typeof callback !== "undefined") {
      callback(null);
    }
  } catch (e) {
    console.error(e);
    if (typeof callback !== "undefined") {
      callback(e);
    }
  }
};
SoundMeter.prototype.stop = function () {
  this.mic.disconnect();
  this.script.disconnect();
};
