// Inisialisasi State
let activeTab = 'tasks';
let tasks = JSON.parse(localStorage.getItem('web_task_manager_calendar_tasks')) || [];
let schedules = JSON.parse(localStorage.getItem('web_task_manager_schedules')) || [];
let viewDate = new Date();
let selectedCalendarDate = new Date();
let isMuted = false;
let activeAlarm = null;
let customSound = localStorage.getItem('custom_alarm_sound') || null;

const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

// DOM Elements
const formTitle = document.getElementById('formTitle');
const itemName = document.getElementById('itemName');
const secondaryLabel = document.getElementById('secondaryLabel');
const itemPriority = document.getElementById('itemPriority');
const itemRoom = document.getElementById('itemRoom');
const btnSubmit = document.getElementById('btnSubmit');
const tabTasks = document.getElementById('tabTasks');
const tabSchedules = document.getElementById('tabSchedules');
const btnMute = document.getElementById('btnMute');
const muteIcon = document.getElementById('muteIcon');
const audioElement = document.getElementById('audioElement');
const alarmModal = document.getElementById('alarmModal');

// Helper Functions Calendar
const daysInMonth = (month, year) => new Date(year, month, 0).getDate();
const firstDayOfMonth = (month, year) => new Date(year, month - 1, 1).getDay();

// Inisialisasi Aplikasi
function init() {
    lucide.createIcons(); // Render initial icons
    if ("Notification" in window) Notification.requestPermission();
    
    populateDateSelects();
    setupEventListeners();
    updateUI();
    
    // Mulai Interval Alarm (Berjalan setiap detik)
    setInterval(checkAlarms, 1000);
}

function setupEventListeners() {
    // Tabs
    tabTasks.addEventListener('click', () => { activeTab = 'tasks'; updateUI(); });
    tabSchedules.addEventListener('click', () => { activeTab = 'schedules'; updateUI(); });

    // Calendar Navigation
    document.getElementById('btnPrevMonth').addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth() - 1); renderCalendar(); });
    document.getElementById('btnNextMonth').addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth() + 1); renderCalendar(); });
    document.getElementById('btnToday').addEventListener('click', () => { viewDate = new Date(); selectedCalendarDate = new Date(); updateUI(); });

    // Form Submit
    document.getElementById('mainForm').addEventListener('submit', handleFormSubmit);

    // Mute/Unmute
    btnMute.addEventListener('click', () => {
        isMuted = !isMuted;
        btnMute.className = `p-1.5 rounded-lg border-2 ${isMuted ? 'border-red-200 text-red-400' : 'border-blue-200 text-blue-400'}`;
        muteIcon.setAttribute('data-lucide', isMuted ? 'volume-x' : 'volume-2');
        lucide.createIcons();
    });

    // Alarm Stop
    document.getElementById('btnStopAlarm').addEventListener('click', stopAlarm);
}

function populateDateSelects() {
    const daySelect = document.getElementById('selectDay');
    const monthSelect = document.getElementById('selectMonth');
    const yearSelect = document.getElementById('selectYear');

    for(let i=1; i<=31; i++) daySelect.innerHTML += `<option value="${i}" ${i === new Date().getDate() ? 'selected' : ''}>${i}</option>`;
    for(let i=1; i<=12; i++) monthSelect.innerHTML += `<option value="${i}" ${i === new Date().getMonth()+1 ? 'selected' : ''}>${i}</option>`;
    
    const currentYear = new Date().getFullYear();
    for(let i=currentYear-2; i<=currentYear+5; i++) yearSelect.innerHTML += `<option value="${i}" ${i === currentYear ? 'selected' : ''}>${i}</option>`;
}

function updateUI() {
    // Update Tab Styles
    if (activeTab === 'tasks') {
        tabTasks.className = "flex items-center gap-2 px-6 py-3 rounded-t-2xl font-black text-xs transition-all border-x border-t bg-white border-slate-300 text-blue-600";
        tabSchedules.className = "flex items-center gap-2 px-6 py-3 rounded-t-2xl font-black text-xs transition-all border-x border-t bg-slate-200/50 border-transparent text-slate-400";
        
        formTitle.innerHTML = `<i data-lucide="sticky-note" class="text-yellow-500 w-5 h-5"></i> Daftar Tugas`;
        itemName.placeholder = "Tulis tugas baru...";
        secondaryLabel.innerText = "Prioritas";
        itemPriority.classList.remove('hidden');
        itemRoom.classList.add('hidden');
        btnSubmit.className = "w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 bg-blue-600 text-white";
    } else {
        tabSchedules.className = "flex items-center gap-2 px-6 py-3 rounded-t-2xl font-black text-xs transition-all border-x border-t bg-white border-slate-300 text-indigo-600";
        tabTasks.className = "flex items-center gap-2 px-6 py-3 rounded-t-2xl font-black text-xs transition-all border-x border-t bg-slate-200/50 border-transparent text-slate-400";
        
        formTitle.innerHTML = `<i data-lucide="graduation-cap" class="text-yellow-500 w-5 h-5"></i> Input Kuliah`;
        itemName.placeholder = "Nama mata kuliah...";
        secondaryLabel.innerText = "Ruangan";
        itemPriority.classList.add('hidden');
        itemRoom.classList.remove('hidden');
        btnSubmit.className = "w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 bg-indigo-600 text-white";
    }
    
    lucide.createIcons();
    renderCalendar();
    renderAgenda();
}

function renderCalendar() {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth() + 1;
    
    document.getElementById('calendarMonth').innerText = monthNames[month - 1];
    document.getElementById('calendarYear').innerText = `${year} // ACADEMIC_YEAR`;

    const totalDays = daysInMonth(month, year);
    const startDay = firstDayOfMonth(month, year);
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';

    // Empty cells
    for (let i = 0; i < startDay; i++) {
        calendarGrid.innerHTML += `<div class="h-20 md:h-28 border border-slate-200/50 bg-slate-100/30"></div>`;
    }

    // Days
    for (let d = 1; d <= totalDays; d++) {
        const dateKey = `${year}-${month}-${d}`;
        const dayTasks = tasks.filter(t => t.dateKey === dateKey);
        const daySchedules = schedules.filter(s => s.dateKey === dateKey);
        
        const isToday = new Date().toDateString() === new Date(year, month - 1, d).toDateString();
        const isSelected = selectedCalendarDate.toDateString() === new Date(year, month - 1, d).toDateString();

        const bgClass = isSelected ? 'bg-yellow-50/50 ring-2 ring-inset ring-amber-300 z-10' : 'bg-white';
        const numClass = isToday ? 'bg-red-500 text-white' : 'text-slate-400 group-hover:text-blue-600';

        let eventsHTML = '';
        daySchedules.forEach(s => {
            eventsHTML += `<div class="text-[8px] md:text-[9px] px-1 py-0.5 rounded-sm border-l-2 border-indigo-500 bg-indigo-50 text-indigo-700 truncate font-bold uppercase mb-0.5">📖 ${s.name}</div>`;
        });
        dayTasks.forEach(t => {
            const completedClass = t.completed ? 'opacity-30 grayscale line-through' : '';
            eventsHTML += `<div class="text-[8px] md:text-[9px] px-1 py-0.5 rounded-sm border-l-2 border-emerald-500 bg-emerald-50 text-emerald-700 truncate font-bold uppercase mb-0.5 ${completedClass}">✏️ ${t.name}</div>`;
        });

        const dayEl = document.createElement('div');
        dayEl.className = `h-20 md:h-28 border border-slate-200 p-1 cursor-pointer transition-all relative overflow-hidden hover:bg-blue-50/30 group calendar-day-bg ${bgClass}`;
        dayEl.innerHTML = `
            <span class="text-[10px] font-black px-1.5 py-0.5 rounded ${numClass}">${String(d).padStart(2, '0')}</span>
            <div class="mt-1 space-y-0.5 overflow-hidden no-scrollbar h-[calc(100%-24px)] overflow-y-auto">${eventsHTML}</div>
        `;
        
        dayEl.onclick = () => {
            selectedCalendarDate = new Date(year, month - 1, d);
            renderCalendar(); // Re-render to update selected styling
            renderAgenda();
        };
        
        calendarGrid.appendChild(dayEl);
    }
}

function renderAgenda() {
    const agendaDateText = document.getElementById('agendaDateText');
    agendaDateText.innerText = `${selectedCalendarDate.getDate()}/${selectedCalendarDate.getMonth()+1}`;

    const dateKey = `${selectedCalendarDate.getFullYear()}-${selectedCalendarDate.getMonth() + 1}-${selectedCalendarDate.getDate()}`;
    const filteredTasks = tasks.filter(t => t.dateKey === dateKey);
    const filteredSchedules = schedules.filter(s => s.dateKey === dateKey);
    const agendaList = document.getElementById('agendaList');
    
    agendaList.innerHTML = '';
    const allItems = [...filteredSchedules, ...filteredTasks];

    if (allItems.length === 0) {
        agendaList.innerHTML = `
            <div class="text-center py-10 opacity-20">
                <i data-lucide="sticky-note" class="w-10 h-10 mx-auto mb-2"></i>
                <p class="text-[10px] font-black uppercase">Tidak ada catatan</p>
            </div>
        `;
    } else {
        allItems.forEach(item => {
            const isSchedule = item.hasOwnProperty('room'); // Determine type
            const indicatorColor = isSchedule ? 'bg-indigo-400' : 'bg-emerald-400';
            const roomText = isSchedule && item.room ? `• RM:${item.room}` : '';
            
            const el = document.createElement('div');
            el.className = "flex items-center gap-3 p-3 bg-white border border-amber-200 rounded-xl shadow-sm group";
            el.innerHTML = `
                <div class="w-1.5 h-8 rounded-full ${indicatorColor}"></div>
                <div class="flex-1">
                    <p class="text-xs font-black text-slate-700 truncate">${item.name}</p>
                    <p class="text-[9px] font-bold text-slate-400 uppercase">${item.time || item.timeOnly} ${roomText}</p>
                </div>
                <button class="text-slate-300 hover:text-red-500 cursor-pointer opacity-0 group-hover:opacity-100 transition-all" onclick="deleteItem(${item.id}, ${isSchedule})">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            `;
            agendaList.appendChild(el);
        });
    }
    lucide.createIcons();
}

function handleFormSubmit(e) {
    e.preventDefault();
    const nameVal = itemName.value.trim();
    if (!nameVal) return;

    const day = document.getElementById('selectDay').value;
    const month = document.getElementById('selectMonth').value;
    const year = document.getElementById('selectYear').value;
    const time = document.getElementById('itemTime').value;

    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${time}`;
    const dateKey = `${year}-${month}-${day}`;
    
    if (activeTab === 'tasks') {
        tasks.push({
            id: Date.now(),
            name: nameVal,
            datetime: dateStr,
            timeOnly: time,
            priority: itemPriority.value,
            completed: false,
            dateKey: dateKey
        });
        tasks.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
        localStorage.setItem('web_task_manager_calendar_tasks', JSON.stringify(tasks));
    } else {
        schedules.push({
            id: Date.now(),
            name: nameVal,
            datetime: dateStr,
            time: time,
            room: itemRoom.value,
            dateKey: dateKey
        });
        schedules.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
        localStorage.setItem('web_task_manager_schedules', JSON.stringify(schedules));
    }

    itemName.value = '';
    itemRoom.value = '';
    renderCalendar();
    renderAgenda();
}

// Terhubung via inline-onclick di renderAgenda
window.deleteItem = function(id, isSchedule) {
    if (isSchedule) {
        schedules = schedules.filter(s => s.id !== id);
        localStorage.setItem('web_task_manager_schedules', JSON.stringify(schedules));
    } else {
        tasks = tasks.filter(t => t.id !== id);
        localStorage.setItem('web_task_manager_calendar_tasks', JSON.stringify(tasks));
    }
    renderCalendar();
    renderAgenda();
};

function checkAlarms() {
    const nowTimestamp = new Date().getTime();

    tasks.forEach(task => {
        const taskTimestamp = new Date(task.datetime).getTime();
        if (!task.completed && Math.abs(nowTimestamp - taskTimestamp) < 1000) {
            triggerAlarm(task, "TUGAS SEKOLAH!");
        }
    });

    schedules.forEach(sched => {
        const schedTimestamp = new Date(sched.datetime).getTime();
        if (Math.abs(nowTimestamp - schedTimestamp) < 1000) {
            triggerAlarm(sched, "JADWAL KULIAH!");
        }
    });
}

function triggerAlarm(item, label) {
    activeAlarm = { ...item, label };
    
    // Tampilkan Modal
    document.getElementById('alarmLabel').innerText = `🔔 ${label}`;
    document.getElementById('alarmName').innerText = `"${item.name}"`;
    if (item.room) {
        document.getElementById('alarmRoom').innerText = `LOKASI: RUANG ${item.room}`;
        document.getElementById('alarmRoom').classList.remove('hidden');
    } else {
        document.getElementById('alarmRoom').classList.add('hidden');
    }
    
    alarmModal.classList.remove('hidden');
    alarmModal.classList.add('flex');

    if (!isMuted) playAlarmSound();
}

function playAlarmSound() {
    if (customSound && audioElement) {
        audioElement.src = customSound;
        audioElement.play().catch(() => {});
    } else {
        // Fallback Web Audio API (Oscillator)
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        osc.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5 note
        osc.start();
        setTimeout(() => osc.stop(), 1500);
    }
}

function stopAlarm() {
    if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
    }
    activeAlarm = null;
    alarmModal.classList.add('hidden');
    alarmModal.classList.remove('flex');
}

// Mulai aplikasi
init();