
const monthInput = document.getElementById('month');
const dayInput = document.getElementById('day');
const dailyBtn = document.getElementById('dailyBtn');
const monthlyBtn = document.getElementById('monthlyBtn');
const loading = document.getElementById('loading');
const error = document.getElementById('error');
const dailyView = document.getElementById('dailyView');
const monthlyView = document.getElementById('monthlyView');
const prayerTimes = document.getElementById('prayerTimes');
const prayerTable = document.getElementById('prayerTable');

const nextPrayerName = document.getElementById('nextPrayerName');
const nextPrayerTime = document.getElementById('nextPrayerTime');
const prayerCountdown = document.getElementById('prayerCountdown');

let prayerData = [];
let prayerTimeZone = 'Europe/London';
let countdownTarget = null;

function getPrayerTimes(year, month) {
    const url = `https://api.aladhan.com/v1/calendar/${year}/${month}?latitude=51.508515&longitude=-0.1254872&method=2`;

    const xhr = new XMLHttpRequest();

    loading.hidden = false;
    error.textContent = "";

    xhr.open("GET", url);

    xhr.onload = function () {
        loading.hidden = true;

        if (xhr.status === 200) {
            try {
                const response = JSON.parse(xhr.responseText);

                if (response.code !== 200 || !Array.isArray(response.data)) {
                    throw new Error("Invalid API response");
                }

                prayerData = response.data;

                if (response.data[0].meta.timezone) {
                    prayerTimeZone = response.data[0].meta.timezone;
                }

                showDailyPrayerTimes();
                showMonthlyPrayerTimes();
                updateNextPrayer();
            } catch (e) {
                prayerData = [];
                prayerTimes.innerHTML = "";
                prayerTable.innerHTML = "";
                resetNextPrayer();
                error.textContent =
                    "Unable to read prayer times. Please try again.";
            }
        } else {
            prayerData = [];
            prayerTimes.innerHTML = "";
            prayerTable.innerHTML = "";
            resetNextPrayer();
            error.textContent =
                "Failed to load prayer times. Please try again.";
        }
    };

    xhr.onerror = function () {
        loading.hidden = true;
        prayerData = [];
        prayerTimes.innerHTML = "";
        prayerTable.innerHTML = "";
        resetNextPrayer();
        error.textContent =
            "Network error. Please check your connection.";
    };

    xhr.send();
}

function showDailyPrayerTimes() {
    const selectedDate = dayInput.value;

    if (!selectedDate) return;

    const selectedDay = selectedDate.split('-')[2];

    const selectedPrayer = prayerData.find(function (day) {
        return parseInt(day.date.gregorian.day, 10) ===
            parseInt(selectedDay, 10);
    });

    if (!selectedPrayer) {
        prayerTimes.innerHTML = "";
        error.textContent =
            "Prayer times for this date are not available.";
        return;
    }

    prayerTimes.innerHTML = "";

    const prayers = [
        { name: "Fajr", time: selectedPrayer.timings.Fajr },
        { name: "Sunrise", time: selectedPrayer.timings.Sunrise },
        { name: "Dhuhr", time: selectedPrayer.timings.Dhuhr },
        { name: "Asr", time: selectedPrayer.timings.Asr },
        { name: "Maghrib", time: selectedPrayer.timings.Maghrib },
        { name: "Isha", time: selectedPrayer.timings.Isha }
    ];

    prayers.forEach(function (prayer) {
        const card = document.createElement("div");
        card.className = "prayer-card";

        const title = document.createElement("h3");
        title.textContent = prayer.name;

        const time = document.createElement("p");
        time.textContent = prayer.time.split(" ")[0];

        card.appendChild(title);
        card.appendChild(time);

        prayerTimes.appendChild(card);
    });
}

function showMonthlyPrayerTimes() {
    prayerTable.innerHTML = "";

    prayerData.forEach(function (day) {
        const row = document.createElement("tr");

        const dateCell = document.createElement("td");
        dateCell.textContent = day.date.gregorian.date;
        row.appendChild(dateCell);

        const prayers = [
            "Fajr",
            "Sunrise",
            "Dhuhr",
            "Asr",
            "Maghrib",
            "Isha"
        ];

        prayers.forEach(function (prayerName) {
            const cell = document.createElement("td");
            cell.textContent = day.timings[prayerName].split(" ")[0];
            row.appendChild(cell);
        });

        prayerTable.appendChild(row);
    });
}

function getCurrentDateInTimeZone() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: prayerTimeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date());

    const year = parts.find(part => part.type === "year").value;
    const month = parts.find(part => part.type === "month").value;
    const day = parts.find(part => part.type === "day").value;

    return `${year}-${month}-${day}`;
}

function getCurrentTimeInTimeZone() {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: prayerTimeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
    }).formatToParts(new Date());

    const hour = parts.find(part => part.type === "hour").value;
    const minute = parts.find(part => part.type === "minute").value;
    const second = parts.find(part => part.type === "second").value;

    return `${hour}:${minute}:${second}`;
}

function updateNextPrayer() {
    countdownTarget = null;

    if (!prayerData.length || !dayInput.value) {
        resetNextPrayer();
        return;
    }

    const selectedDate = dayInput.value;
    const todayDate = getCurrentDateInTimeZone();
    const currentTime = getCurrentTimeInTimeZone();

    if (selectedDate < todayDate) {
        nextPrayerName.textContent = "Date has passed";
        nextPrayerTime.textContent = "Choose today or a future date";
        prayerCountdown.textContent = "--:--:--";
        return;
    }

    let targetDay = selectedDate;
    let targetPrayer = null;

    const selectedDay = parseInt(selectedDate.split('-')[2], 10);

    const selectedPrayer = prayerData.find(function (day) {
        return parseInt(day.date.gregorian.day, 10) === selectedDay;
    });

    if (!selectedPrayer) {
        resetNextPrayer();
        return;
    }

    const prayerNames = [
        "Fajr",
        "Dhuhr",
        "Asr",
        "Maghrib",
        "Isha"
    ];

    if (selectedDate === todayDate) {
        for (const name of prayerNames) {
            const time = selectedPrayer.timings[name].split(" ")[0];

            if (time > currentTime) {
                targetPrayer = { name: name, time: time };
                break;
            }
        }

        if (!targetPrayer) {
            const selectedIndex = prayerData.indexOf(selectedPrayer);
            const nextDay = prayerData[selectedIndex + 1];

            if (nextDay) {
                targetDay = getNextDate(selectedDate);
                targetPrayer = {
                    name: "Fajr",
                    time: nextDay.timings.Fajr.split(" ")[0]
                };
            }
        }
    } else {
        targetPrayer = {
            name: "Fajr",
            time: selectedPrayer.timings.Fajr.split(" ")[0]
        };
    }

    if (!targetPrayer) {
        nextPrayerName.textContent = "No more prayers today";
        nextPrayerTime.textContent = "Check the next day";
        prayerCountdown.textContent = "--:--:--";
        return;
    }

    nextPrayerName.textContent = targetPrayer.name;
    nextPrayerTime.textContent = targetPrayer.time;

    const dateParts = targetDay.split('-').map(Number);
    const timeParts = targetPrayer.time.split(':').map(Number);

    countdownTarget = Date.UTC(
        dateParts[0],
        dateParts[1] - 1,
        dateParts[2],
        timeParts[0],
        timeParts[1],
        0
    );

    updateCountdown();
}

function getNextDate(dateString) {
    const date = new Date(dateString + "T12:00:00Z");
    date.setUTCDate(date.getUTCDate() + 1);

    return date.toISOString().split("T")[0];
}

function updateCountdown() {
    if (!countdownTarget) return;

    const currentDate = getCurrentDateInTimeZone();
    const currentTime = getCurrentTimeInTimeZone();
    const dateParts = currentDate.split('-').map(Number);
    const timeParts = currentTime.split(':').map(Number);

    const currentTimestamp = Date.UTC(
        dateParts[0],
        dateParts[1] - 1,
        dateParts[2],
        timeParts[0],
        timeParts[1],
        timeParts[2]
    );

    let remaining = Math.max(
        0,
        Math.floor((countdownTarget - currentTimestamp) / 1000)
    );

    const hours = String(Math.floor(remaining / 3600)).padStart(2, '0');
    remaining %= 3600;

    const minutes = String(Math.floor(remaining / 60)).padStart(2, '0');
    const seconds = String(remaining % 60).padStart(2, '0');

    prayerCountdown.textContent = `${hours}:${minutes}:${seconds}`;
}

function resetNextPrayer() {
    countdownTarget = null;
    nextPrayerName.textContent = "Unavailable";
    nextPrayerTime.textContent = "--:--";
    prayerCountdown.textContent = "--:--:--";
}

function setView(view) {
    const showDaily = view === "daily";

    dailyView.hidden = !showDaily;
    monthlyView.hidden = showDaily;

    dailyBtn.classList.toggle("active", showDaily);
    monthlyBtn.classList.toggle("active", !showDaily);
}

const today = new Date();
const currentYear = today.getFullYear();
const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
const currentDay = String(today.getDate()).padStart(2, '0');

monthInput.value = `${currentYear}-${currentMonth}`;
dayInput.value = `${currentYear}-${currentMonth}-${currentDay}`;

const [initYear, initMonth] = monthInput.value.split('-');

getPrayerTimes(initYear, initMonth);

setInterval(updateCountdown, 1000);

dailyBtn.addEventListener("click", function () {
    setView("daily");
});

monthlyBtn.addEventListener("click", function () {
    setView("monthly");
});

monthInput.addEventListener('change', function () {
    if (!monthInput.value) return;

    const [year, month] = monthInput.value.split('-');
    let currentDay = parseInt(dayInput.value.split('-')[2], 10);

    const lastDayInMonth = new Date(year, month, 0).getDate();

    if (currentDay > lastDayInMonth) {
        currentDay = lastDayInMonth;
    }

    const formattedDay = String(currentDay).padStart(2, '0');

    dayInput.value = `${year}-${month}-${formattedDay}`;

    getPrayerTimes(year, month);
});

dayInput.addEventListener('change', function () {
    if (!dayInput.value) return;

    const [year, month] = dayInput.value.split('-');
    const newMonthValue = `${year}-${month}`;

    if (monthInput.value === newMonthValue) {
        error.textContent = "";
        showDailyPrayerTimes();
        updateNextPrayer();
    } else {
        monthInput.value = newMonthValue;
        getPrayerTimes(year, month);
    }
});
