const FACE_LABEL = "Fariz";
const FACE_MATCH_THRESHOLD = 0.42;
const REQUIRED_CONSECUTIVE_MATCHES = 5;

export function createFaceLockFeature(elements, options) {
  const { onUnlock, backendBaseUrl, onAuthFailure } = options;
  let unlocked = false;
  let pollingTimer = null;
  let consecutiveMatches = 0;
  let isCheckingFrame = false;
  let verificationFinalized = false;
  let lastFailureSoundAt = 0;

  function triggerFailureSound() {
    const now = Date.now();
    if (now - lastFailureSoundAt < 1500) {
      return;
    }

    lastFailureSoundAt = now;
    onAuthFailure?.();
  }

  function setLockStatus(message, tone = "default") {
    elements.faceLockStatus.textContent = message;
    elements.faceLockStatus.dataset.tone = tone;
  }

  function captureWebcamSnapshot() {
    const video = elements.webcam;
    if (
      !video ||
      video.readyState < 2 ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.88);
  }

  function applySnapshotAsBackground(snapshotDataUrl) {
    if (!snapshotDataUrl) {
      return;
    }

    document.body.style.setProperty(
      "--captured-bg-image",
      `url(\"${snapshotDataUrl}\")`,
    );
    document.body.classList.add("captured-background");
  }

  function finalizeVerification() {
    if (verificationFinalized) {
      return;
    }

    verificationFinalized = true;
    const snapshotDataUrl = captureWebcamSnapshot();
    applySnapshotAsBackground(snapshotDataUrl);
  }

  async function startCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false,
    });
    elements.webcam.srcObject = stream;
  }

  async function loadReferenceDescriptors() {
    const descriptorList = [];
    const candidateImages = [
      "1.jpg",
      "2.jpg",
      "3.jpg",
      "4.jpg",
      "5.jpg",
      "7.jpg",
      "8.jpg",
      "10.jpg",
      "20260314_113755.jpg",
      "20260314_113758.jpg",
    ];

    for (const imageName of candidateImages) {
      try {
        const image = await faceapi.fetchImage(
          `face-lock-project/labeled_images/${FACE_LABEL}/${imageName}`,
        );
        const detection = await faceapi
          .detectSingleFace(image)
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (detection?.descriptor) {
          descriptorList.push(detection.descriptor);
        }
      } catch {
        // continue to next image silently
      }
    }

    if (descriptorList.length === 0) {
      throw new Error("No reference face descriptors found.");
    }

    return new faceapi.LabeledFaceDescriptors(FACE_LABEL, descriptorList);
  }

  function finishUnlock(mode) {
    if (unlocked) {
      return;
    }

    finalizeVerification();
    unlocked = true;
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }

    setLockStatus(`Access granted (${mode}).`, "ok");
    elements.siteLock.classList.add("hidden");
    document.body.classList.remove("locked");
    onUnlock?.();
  }

  async function verifyAccessCode() {
    const code = elements.backupCodeInput.value.trim();
    if (!code) {
      setLockStatus("Enter access code.", "warn");
      triggerFailureSound();
      return;
    }

    setLockStatus("Verifying access code...", "default");

    try {
      const response = await fetch(`${backendBaseUrl}/verify-access-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || "Verification failed");
      }

      if (result.ok) {
        finishUnlock("backup code");
      } else {
        finalizeVerification();
        setLockStatus(result.message || "Invalid access code", "warn");
        elements.denialOverlay.classList.remove("hidden");
        triggerFailureSound();
      }
    } catch (error) {
      finalizeVerification();
      setLockStatus(`Code verification error: ${error.message}`, "warn");
      triggerFailureSound();
    }
  }

  async function beginFaceRecognitionLoop(faceMatcher) {
    setLockStatus(`Active scan: ${FACE_LABEL}`, "default");

    pollingTimer = setInterval(async () => {
      if (unlocked || isCheckingFrame) {
        return;
      }

      isCheckingFrame = true;

      try {
        const detections = await faceapi
          .detectAllFaces(elements.webcam)
          .withFaceLandmarks()
          .withFaceDescriptors();

        if (detections.length !== 1) {
          consecutiveMatches = 0;
          elements.denialOverlay.classList.remove("hidden");
          setLockStatus("Show exactly one face to continue.", "warn");
          triggerFailureSound();
          return;
        }

        const bestMatch = faceMatcher.findBestMatch(detections[0].descriptor);
        const isMatched =
          bestMatch.label === FACE_LABEL &&
          bestMatch.distance <= FACE_MATCH_THRESHOLD;

        if (isMatched) {
          consecutiveMatches += 1;
          elements.denialOverlay.classList.add("hidden");
          setLockStatus(
            `Face match ${consecutiveMatches}/${REQUIRED_CONSECUTIVE_MATCHES}...`,
            "default",
          );

          if (consecutiveMatches >= REQUIRED_CONSECUTIVE_MATCHES) {
            finishUnlock("face recognition");
          }
        } else {
          consecutiveMatches = 0;
          elements.denialOverlay.classList.remove("hidden");
          setLockStatus("Face not recognized. Use backup code.", "warn");
          triggerFailureSound();
        }
      } catch {
        consecutiveMatches = 0;
        elements.denialOverlay.classList.remove("hidden");
        setLockStatus("Camera scan error. Try again.", "warn");
        triggerFailureSound();
      } finally {
        isCheckingFrame = false;
      }
    }, 800);
  }

  async function init() {
    if (typeof faceapi === "undefined") {
      setLockStatus("face-api failed to load. Use backup code.", "warn");
      elements.denialOverlay.classList.remove("hidden");
      return;
    }

    try {
      setLockStatus("Loading biometric models...", "default");
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri("face-lock-project/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("face-lock-project/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("face-lock-project/models"),
      ]);

      setLockStatus("Initializing camera...", "default");
      await startCamera();
      const labeledDescriptors = await loadReferenceDescriptors();
      const faceMatcher = new faceapi.FaceMatcher(
        labeledDescriptors,
        FACE_MATCH_THRESHOLD,
      );
      await beginFaceRecognitionLoop(faceMatcher);
    } catch (error) {
      setLockStatus(`Face lock error: ${error.message}`, "warn");
      elements.denialOverlay.classList.remove("hidden");
    }
  }

  function bind() {
    elements.backupCodeBtn.addEventListener("click", () => {
      void verifyAccessCode();
    });

    elements.backupCodeInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        void verifyAccessCode();
      }
    });

    void init();
  }

  return {
    bind,
    isUnlocked: () => unlocked,
  };
}
