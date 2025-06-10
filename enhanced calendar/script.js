document.addEventListener('DOMContentLoaded', () => {
    const pages = document.querySelectorAll('.page');
    let currentDate = new Date();
    let viewMode = 'month';
    let events = {};
    let trophies = [];
    let customTrophy = null;
    let points = { total: 0, bonus: 0 };
    let mediaStore = {};

    // Save all data to a single calendar_data.json file
    const saveData = () => {
        try {
            const data = {
                events,
                points,
                trophies,
                customTrophy,
                mediaStore,
                lastSaved: new Date().toISOString()
            };
            const jsonString = JSON.stringify(data, null, 2);
            if (Object.keys(mediaStore).length > 0) {
                const approxSizeMB = (jsonString.length / 1024 / 1024).toFixed(2);
                if (approxSizeMB > 10) {
                    if (!confirm(`Warning: File size is approximately ${approxSizeMB} MB due to videos. Continue saving?`)) {
                        return;
                    }
                }
            }
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'calendar_data.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert('Data saved as calendar_data.json. Please move it to the data/ folder.');
        } catch (error) {
            alert('Error saving data: ' + error.message);
        }
    };

    // Load data from calendar_data.json
    const loadData = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.events || !data.points || !data.trophies || !data.mediaStore) {
                    throw new Error('Invalid JSON structure: Missing required fields');
                }
                events = data.events;
                points = data.points;
                trophies = data.trophies;
                customTrophy = data.customTrophy || null;
                mediaStore = data.mediaStore;
                updatePoints();
                renderCalendar();
                renderTrophyDisplay();
                showTrophySystem();
                alert('Data loaded successfully!');
            } catch (error) {
                alert('Error loading data: ' + error.message);
            }
        };
        reader.onerror = () => {
            alert('Error reading file.');
        };
        reader.readAsText(file);
    };

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    const switchPage = (pageNum) => {
        pages.forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(`page${pageNum}`).classList.add('active');
    };

    const applyTheme = (theme) => {
        document.body.className = theme;
        document.querySelectorAll('.sidebar, .header, .days-header, .week-days, .day, .month-cell, .hour-cell, .btn').forEach(element => {
            element.className = element.className.split(' ').filter(cls => !['light', 'dark', 'blue', 'green', 'purple', 'pink'].includes(cls)).join(' ') + ` ${theme}`;
        });
    };

    const updatePoints = () => {
        document.getElementById('totalPoints').textContent = points.total;
        document.getElementById('trophyPoints').textContent = points.total;
        document.getElementById('bonusPoints').textContent = points.bonus;
        checkTrophy();
    };

    const renderTrophyDisplay = () => {
        const trophyDisplay = document.getElementById('trophyDisplay');
        trophyDisplay.innerHTML = '';
        if (customTrophy && customTrophy.completed) {
            trophyDisplay.classList.add('active');
            const div = document.createElement('div');
            div.className = 'trophy-container';
            if (customTrophy.image) {
                const img = document.createElement('img');
                img.src = customTrophy.image;
                img.alt = customTrophy.name;
                div.appendChild(img);
            }
            const span = document.createElement('span');
            span.textContent = customTrophy.name;
            div.appendChild(span);
            trophyDisplay.appendChild(div);
        } else {
            trophyDisplay.classList.remove('active');
        }
    };

    const populateYearSelect = () => {
        const select = document.getElementById('yearSelect');
        for (let i = 1; i <= 3000; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            select.appendChild(option);
        }
        select.value = currentDate.getFullYear();
        select.onchange = () => {
            currentDate.setFullYear(parseInt(select.value));
            renderCalendar();
        };
    };

    const renderCalendar = () => {
        const calendarContent = document.getElementById('calendarContent');
        calendarContent.innerHTML = '';
        const currentPeriod = document.getElementById('currentPeriod');

        if (viewMode === 'month') {
            renderMonthView();
        } else if (viewMode === 'week') {
            renderWeekView();
        } else {
            renderDayView();
        }
    };

    const renderMonthView = () => {
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        document.getElementById('currentPeriod').textContent = `${monthNames[month]} ${year}`;
        const header = createDaysHeader();
        const grid = document.createElement('div');
        grid.className = 'month-grid';
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            grid.appendChild(createDayCell(''));
        }
        for (let i = 1; i <= daysInMonth; i++) {
            const dayCell = createDayCell(i);
            addEventsToCell(dayCell, new Date(year, month, i));
            dayCell.onclick = () => {
                showDailyView(new Date(year, month, i));
            };
            grid.appendChild(dayCell);
        }
        document.getElementById('calendarContent').appendChild(header);
        document.getElementById('calendarContent').appendChild(grid);
    };

    const createDaysHeader = () => {
        const header = document.createElement('div');
        header.className = 'days-header';
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
            const div = document.createElement('div');
            div.textContent = day;
            header.appendChild(div);
        });
        return header;
    };

    const createDayCell = (day) => {
        const div = document.createElement('div');
        div.className = 'day';
        if (day) {
            div.innerHTML = `<span>${day}</span>`;
            if (isToday(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))) {
                div.classList.add('today');
            }
        }
        return div;
    };

    const addEventsToCell = (cell, date) => {
        const dateKey = date.toDateString();
        if (events[dateKey]) {
            events[dateKey].forEach(event => {
                const eventDiv = document.createElement('div');
                eventDiv.className = 'event';
                eventDiv.style.backgroundColor = event.color;
                eventDiv.textContent = `${event.title} (Created: ${new Date(event.createdAt).toLocaleTimeString()})`;
                cell.appendChild(eventDiv);
            });
        }
    };

    const renderWeekView = () => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        
        document.getElementById('currentPeriod').textContent = `Week of ${monthNames[startOfWeek.getMonth()]} ${startOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;

        const header = createDaysHeader();
        const grid = document.createElement('div');
        grid.className = 'week-days';
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const dayCell = createDayCell(date.getDate());
            addEventsToCell(dayCell, date);
            dayCell.onclick = () => {
                showDailyView(date);
            };
            grid.appendChild(dayCell);
        }
        document.getElementById('calendarContent').appendChild(header);
        document.getElementById('calendarContent').appendChild(grid);
    };

    const renderDayView = () => {
        document.getElementById('currentPeriod').textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`;
        const dayCell = createDayCell(currentDate.getDate());
        addEventsToCell(dayCell, currentDate);
        dayCell.onclick = () => {
            showDailyView(currentDate);
        };
        document.getElementById('calendarContent').appendChild(dayCell);
    };

    const showDailyView = (date) => {
        switchPage(2);
        const hoursGrid = document.getElementById('hoursGrid');
        hoursGrid.innerHTML = '';
        currentDate = date;

        for (let i = 0; i < 24; i++) {
            const hourCell = document.createElement('div');
            hourCell.className = 'hour-cell';
            hourCell.textContent = `${i}:00`;
            hourCell.onclick = () => {
                const title = prompt('Enter event/task title:');
                const time = prompt('Enter time (HH:MM):', `${i}:00`);
                if (title && time) {
                    const [hour, minute] = time.split(':');
                    const color = '#' + Math.floor(Math.random()*16777215).toString(16);
                    const dateKey = date.toDateString();
                    if (!events[dateKey]) {
                        events[dateKey] = [];
                    }
                    events[dateKey].push({ title, hour: parseInt(hour), minute: parseInt(minute), color, completed: false, createdAt: new Date().toISOString() });
                    points.total += customTrophy ? customTrophy.taskPoints : 10;
                    if (events[dateKey].length === 5) {
                        points.bonus += 50;
                    }
                    updatePoints();
                    showDailyView(date);
                    checkTrophy();
                }
            };
            const dateKey = date.toDateString();
            if (events[dateKey]) {
                events[dateKey].filter(e => e.hour === i).forEach(event => {
                    const eventDiv = document.createElement('div');
                    eventDiv.className = 'event';
                    eventDiv.style.backgroundColor = event.color;
                    eventDiv.textContent = `${event.title} (${event.hour}:${event.minute || '00'}) ${event.completed ? '✓' : ''} (Created: ${new Date(event.createdAt).toLocaleTimeString()})`;
                    eventDiv.onclick = (e) => {
                        e.stopPropagation();
                        if (!event.completed && confirm('Mark as completed?')) {
                            event.completed = true;
                            points.total += customTrophy ? customTrophy.eventPoints : 20;
                            updatePoints();
                            checkTrophy();
                            showDailyView(date);
                        } else if (confirm('Delete event?')) {
                            events[dateKey] = events[dateKey].filter(ev => ev !== event);
                            showDailyView(date);
                        }
                    };
                    hourCell.appendChild(eventDiv);
                });
            }
            hoursGrid.appendChild(hourCell);
        }
    };

    const isToday = (date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
               date.getMonth() === today.getMonth() &&
               date.getFullYear() === today.getFullYear();
    };

    const playAnimationSequence = () => {
        switchPage(4);
        const combinedVideo = document.getElementById('combinedVideo');
        const dateKey = currentDate.toDateString();
        if (events[dateKey]) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const mediaElements = [];
            const frameRate = 30;
            let totalDuration = 0;

            events[dateKey].sort((a, b) => a.hour - b.hour || a.minute - b.minute).forEach(event => {
                if (mediaStore[event.title]) {
                    const mediaData = mediaStore[event.title];
                    const element = document.createElement('video');
                    element.src = mediaData.url;
                    element.muted = true;
                    element.startTime = mediaData.startTime || 0;
                    mediaElements.push({ element, duration: mediaData.duration });
                    totalDuration += mediaData.duration;
                } else {
                    const element = document.createElement('video');
                    element.src = `videos/default.mp4`;
                    element.muted = true;
                    element.startTime = 0;
                    element.onloadedmetadata = () => {
                        element.duration = Math.min(element.duration, 30);
                    };
                    element.onerror = () => {
                        element.src = `videos/default.mp4`;
                    };
                    const defaultDuration = 30;
                    mediaElements.push({ element, duration: defaultDuration });
                    totalDuration += defaultDuration;
                }
            });

            if (mediaElements.length > 0) {
                Promise.all(mediaElements.map(m => new Promise(resolve => {
                    m.element.onloadeddata = () => {
                        m.element.currentTime = m.element.startTime || 0;
                        resolve();
                    };
                }))).then(() => {
                    canvas.width = 600;
                    canvas.height = 400;
                    const stream = canvas.captureStream(frameRate);
                    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
                    const chunks = [];

                    recorder.ondataavailable = (e) => {
                        chunks.push(e.data);
                    };
                    recorder.onstop = () => {
                        const blob = new Blob(chunks, { type: 'video/webm' });
                        combinedVideo.src = URL.createObjectURL(blob);
                        combinedVideo.play();
                    };

                    recorder.start();
                    let currentFrame = 0;
                    const frameDurations = mediaElements.map(m => m.duration * frameRate);
                    const totalFrames = frameDurations.reduce((sum, dur) => sum + dur, 0);

                    const drawFrame = () => {
                        let frameCount = 0;
                        let segmentIndex = 0;
                        for (let i = 0; i < frameDurations.length; i++) {
                            if (currentFrame < frameCount + frameDurations[i]) {
                                segmentIndex = i;
                                break;
                            }
                            frameCount += frameDurations[i];
                        }

                        if (segmentIndex < mediaElements.length) {
                            const { element, duration } = mediaElements[segmentIndex];
                            const segmentFrame = currentFrame - frameCount;
                            const segmentTime = segmentFrame / frameRate;

                            if (segmentTime <= duration) {
                                ctx.clearRect(0, 0, canvas.width, canvas.height);
                                ctx.drawImage(element, 0, 0, canvas.width, canvas.height);
                                if (element.paused || element.currentTime < element.startTime) {
                                    element.currentTime = element.startTime || 0;
                                    element.play();
                                }
                            }

                            currentFrame++;
                            if (currentFrame < totalFrames) {
                                requestAnimationFrame(drawFrame);
                            } else {
                                recorder.stop();
                            }
                        }
                    };

                    requestAnimationFrame(drawFrame);
                }).catch(error => {
                    alert('Error loading video data: ' + error.message);
                });
            }
        }
    };

    const showTrophySystem = () => {
        switchPage(3);
        const trophyList = document.getElementById('trophyList');
        trophyList.innerHTML = '';
        if (customTrophy) {
            const div = document.createElement('div');
            div.className = 'trophy-container';
            if (customTrophy.image) {
                const img = document.createElement('img');
                img.src = customTrophy.image;
                img.alt = customTrophy.name;
                div.appendChild(img);
            }
            const span = document.createElement('span');
            span.textContent = `${customTrophy.name} (${customTrophy.completed ? 'Completed' : `${points.total}/${customTrophy.pointGoal} Points`})`;
            div.appendChild(span);
            trophyList.appendChild(div);
        }
        // Populate input fields with current trophy data
        document.getElementById('trophyName').value = customTrophy ? customTrophy.name : '';
        document.getElementById('pointGoal').value = customTrophy ? customTrophy.pointGoal : '';
        document.getElementById('taskPoints').value = customTrophy ? customTrophy.taskPoints : '';
        document.getElementById('eventPoints').value = customTrophy ? customTrophy.eventPoints : '';
    };

    const checkTrophy = () => {
        if (customTrophy && !customTrophy.completed && points.total >= customTrophy.pointGoal) {
            customTrophy.completed = true;
            points.bonus += 100;
            trophies.push(customTrophy.name);
            alert(`Trophy Earned: ${customTrophy.name}!`);
            updatePoints();
            renderTrophyDisplay();
        }
    };

    const createTrophy = () => {
        const name = document.getElementById('trophyName').value;
        const pointGoal = parseInt(document.getElementById('pointGoal').value);
        const taskPoints = parseInt(document.getElementById('taskPoints').value);
        const eventPoints = parseInt(document.getElementById('eventPoints').value);
        const imageFile = document.getElementById('trophyImage').files[0];

        if (!name || !pointGoal || !taskPoints || !eventPoints) {
            alert('Please fill in all fields.');
            return;
        }

        if (pointGoal < 100 || taskPoints < 10 || eventPoints < 10) {
            alert('Point goal must be at least 100, and task/event points at least 10.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            customTrophy = {
                name,
                image: e.target.result,
                pointGoal,
                taskPoints,
                eventPoints,
                completed: false
            };
            trophies = trophies.filter(t => t !== (customTrophy && customTrophy.name));
            showTrophySystem();
            renderTrophyDisplay();
            alert('Trophy created successfully!');
        };
        reader.onerror = () => {
            alert('Error reading trophy image.');
        };
        if (imageFile) {
            reader.readAsDataURL(imageFile);
        } else {
            customTrophy = {
                name,
                image: null,
                pointGoal,
                taskPoints,
                eventPoints,
                completed: false
            };
            trophies = trophies.filter(t => t !== (customTrophy && customTrophy.name));
            showTrophySystem();
            renderTrophyDisplay();
            alert('Trophy created successfully!');
        }
    };

    const deleteTrophy = () => {
        if (customTrophy && confirm('Delete the current trophy?')) {
            trophies = trophies.filter(t => t !== customTrophy.name);
            customTrophy = null;
            showTrophySystem();
            renderTrophyDisplay();
            alert('Trophy deleted successfully!');
        }
    };

    const videoBtn = document.getElementById('videoBtn');
    const videoInput = document.getElementById('videoInput');
    videoBtn.onclick = () => {
        videoInput.click();
    };
    videoInput.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const actionText = prompt('Enter action text for this video:');
            if (actionText) {
                const video = document.createElement('video');
                const url = URL.createObjectURL(file);
                video.src = url;
                video.onloadedmetadata = () => {
                    let duration = video.duration;
                    let startTime = 0;
                    if (duration > 30) {
                        const maxStart = duration - 30;
                        startTime = parseFloat(prompt(`Video is ${duration.toFixed(2)}s. Enter start time for a 30s segment (0 to ${maxStart.toFixed(2)}s):`, '0'));
                        if (isNaN(startTime) || startTime < 0 || startTime > maxStart) {
                            alert('Invalid start time. Using 0s.');
                            startTime = 0;
                        }
                        duration = 30;
                    }
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        mediaStore[actionText] = { url: e.target.result, startTime, duration };
                        alert(`Video added for "${actionText}"`);
                        URL.revokeObjectURL(url);
                    };
                    reader.onerror = () => {
                        alert('Error reading video file.');
                        URL.revokeObjectURL(url);
                    };
                    reader.readAsDataURL(file);
                };
                video.onerror = () => {
                    alert('Error loading video file.');
                    URL.revokeObjectURL(url);
                };
            }
        }
    };

    document.getElementById('createEvent').onclick = () => {
        const title = prompt('Enter event/task title:');
        const time = prompt('Enter time (HH:MM):', '09:00');
        if (title && time) {
            const [hour, minute] = time.split(':');
            const color = '#' + Math.floor(Math.random()*16777215).toString(16);
            const dateKey = currentDate.toDateString();
            if (!events[dateKey]) {
                events[dateKey] = [];
            }
            events[dateKey].push({ title, hour: parseInt(hour), minute: parseInt(minute), color, completed: false, createdAt: new Date().toISOString() });
            points.total += customTrophy ? customTrophy.taskPoints : 10;
            updatePoints();
            renderCalendar();
        }
    };
    document.getElementById('trophyBtn').onclick = () => {
        showTrophySystem();
    };
    document.getElementById('monthView').onclick = () => {
        viewMode = 'month';
        renderCalendar();
    };
    document.getElementById('weekView').onclick = () => {
        viewMode = 'week';
        renderCalendar();
    };
    document.getElementById('dayView').onclick = () => {
        viewMode = 'day';
        renderCalendar();
    };
    document.getElementById('today').onclick = () => {
        currentDate = new Date();
        renderCalendar();
    };
    document.getElementById('prev').onclick = () => {
        if (viewMode === 'month') {
            currentDate.setMonth(currentDate.getMonth() - 1);
        } else if (viewMode === 'week') {
            currentDate.setDate(currentDate.getDate() - 7);
        } else {
            currentDate.setDate(currentDate.getDate() - 1);
        }
        renderCalendar();
    };
    document.getElementById('next').onclick = () => {
        if (viewMode === 'month') {
            currentDate.setMonth(currentDate.getMonth() + 1);
        } else if (viewMode === 'week') {
            currentDate.setDate(currentDate.getDate() + 7);
        } else {
            currentDate.setDate(currentDate.getDate() + 1);
        }
        renderCalendar();
    };
    document.getElementById('playAnimation').onclick = () => {
        playAnimationSequence();
    };
    document.getElementById('replayAnimation').onclick = () => {
        playAnimationSequence();
    };
    document.getElementById('topBackBtn').onclick = () => {
        switchPage(1);
    };
    document.getElementById('saveDataBtn').onclick = () => {
        saveData();
    };
    document.getElementById('loadDataBtn').onclick = () => {
        document.getElementById('loadDataInput').click();
    };
    document.getElementById('loadDataInput').onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
            loadData(file);
        }
    };
    document.getElementById('createTrophyBtn').onclick = () => {
        createTrophy();
    };
    document.getElementById('deleteTrophyBtn').onclick = () => {
        deleteTrophy();
    };

    const themeSelect = document.getElementById('themeSelect');
    themeSelect.onchange = () => {
        applyTheme(themeSelect.value);
    };

    applyTheme('light');
    populateYearSelect();
    renderCalendar();
    updatePoints();
});