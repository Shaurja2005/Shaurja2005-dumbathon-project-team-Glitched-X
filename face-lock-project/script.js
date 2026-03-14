const video = document.getElementById('webcam');
const statusHeading = document.getElementById('status-heading');
const denialOverlay = document.getElementById('denial-overlay');
const cameraFrame = document.getElementById('camera-frame');
const backupCodeInput = document.getElementById('backup-code-input');

let systemUnlocked = false;

async function initSystem() {
    try {
        // Step 1: Check if the library was blocked by Tracking Prevention
        if (typeof faceapi === 'undefined') {
            throw new Error("Library Blocked. Disable Shields/Tracking Prevention.");
        }

        statusHeading.innerText = "Loading Security Models...";

        // Step 2: Load Models (Using relative paths)
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri('./models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
            faceapi.nets.faceRecognitionNet.loadFromUri('./models')
        ]);

        statusHeading.innerText = "Initializing Camera...";
        await startVideo();

        // Step 3: Train on Fariz's Photos
        const farizData = await loadFarizData();
        const faceMatcher = new faceapi.FaceMatcher(farizData, 0.6);

        statusHeading.innerText = "Active: Scanning for Fariz";
        
        // Step 4: Continuous Recognition Loop
        setInterval(async () => {
            if (systemUnlocked) return; // Stop checking if already unlocked manually

            const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors();
            
            if (detections.length > 0) {
                const match = faceMatcher.findBestMatch(detections[0].descriptor);
                updateUI(match.label === 'Fariz');
            }
        }, 500);

    } catch (err) {
        console.error(err);
        statusHeading.innerText = "Error: " + err.message;
        statusHeading.style.color = "#ff4d4d";
    }
}

async function startVideo() {
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    video.srcObject = stream;
}

async function loadFarizData() {
    const label = 'Fariz';
    const descriptions = [];
    for (let i = 1; i <= 5; i++) {
        try {
            const img = await faceapi.fetchImage(`./labeled_images/${label}/${i}.jpg`);
            const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
            if (detection) descriptions.push(detection.descriptor);
        } catch (e) {
            console.warn(`Skipped image ${i}.jpg`);
        }
    }
    return new faceapi.LabeledFaceDescriptors(label, descriptions);
}

function updateUI(isMatched) {
    if (isMatched) {
        systemUnlocked = true;
        denialOverlay.classList.add('opacity-0', 'pointer-events-none');
        cameraFrame.style.borderColor = "#22c55e";
        statusHeading.innerText = "Identity Verified: Fariz";
        statusHeading.style.color = "#22c55e";
    } else {
        denialOverlay.classList.remove('opacity-0', 'pointer-events-none');
        cameraFrame.style.borderColor = "#7f1d1d";
        statusHeading.innerText = "Access Denied";
        statusHeading.style.color = "#ff4d4d";
    }
}

// Backup Code Logic
backupCodeInput.addEventListener('input', (e) => {
    if (e.target.value === '6969') {
        updateUI(true);
        statusHeading.innerText = "Identity Verified: Backup Override";
        e.target.value = ''; // clear input
    }
});

initSystem();