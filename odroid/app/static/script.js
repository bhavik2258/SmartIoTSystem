let temperature = 24.5;
let humidity = 55;
let objectDetected = false;
let environmentChart;
const history = [];
const $ = (id) => document.getElementById(id);
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const randomStep = (v, amount, min, max) => clamp(v + (Math.random() - 0.5) * amount, min, max);

function timeLabel(date = new Date()) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function roomStatus(t, h) {
  if (t >= 35) return 'High temperature';
  if (t <= 18) return 'Low temperature';
  if (h < 30 || h > 70) return 'Humidity needs attention';
  return 'Temperature normal';
}

function createChart() {
  environmentChart = new Chart($('environmentChart').getContext('2d'), {
    type: 'line',
    data: { labels: history.map(x => x.time), datasets: [
      { label: 'Temperature °C', data: history.map(x => x.temperature), borderColor: '#f59e62', backgroundColor: 'rgba(245,158,98,.10)', yAxisID: 'y', tension: .38, fill: true, pointRadius: 2, borderWidth: 2 },
      { label: 'Humidity %', data: history.map(x => x.humidity), borderColor: '#65a9ed', yAxisID: 'y1', tension: .38, fill: false, pointRadius: 2, borderWidth: 2 }
    ]},
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false } }, scales: {
      x: { grid: { display: false }, ticks: { color: '#8794a8', maxTicksLimit: 6, maxRotation: 0 } },
      y: { position: 'left', min: 15, max: 40, grid: { color: '#edf0f4' }, ticks: { color: '#8794a8' } },
      y1: { position: 'right', min: 20, max: 90, grid: { display: false }, ticks: { color: '#8794a8' } }
    }}
  });
}

function renderTable() {
  $('readingsTable').innerHTML = [...history].reverse().slice(0, 6).map(r => {
    const status = roomStatus(r.temperature, r.humidity);
    return `<tr><td>${r.time}</td><td>${r.temperature.toFixed(1)} °C</td><td>${r.humidity.toFixed(1)}%</td><td><span class="table-pill ${r.object ? 'pill-detected' : 'pill-clear'}">${r.object ? 'Entry detected' : 'Clear'}</span></td><td><span class="table-pill ${r.object ? 'pill-detected' : 'pill-clear'}">${r.object ? 'AC ON' : 'AC OFF'}</span></td></tr>`;
  }).join('');
}

function updateDashboard(initial = false, detectedState = objectDetected) {
  if (!initial) {
    temperature = randomStep(temperature, .5, 21, 29);
    humidity = randomStep(humidity, 1.2, 40, 68);
    objectDetected = detectedState;
  }
  $('temperature').textContent = temperature.toFixed(1);
  $('humidity').textContent = humidity.toFixed(1);
  $('objectDetected').textContent = objectDetected ? 'DETECTED' : 'CLEAR';
  $('objectDetected').style.color = objectDetected ? '#8268c9' : '#718096';
  $('objectState').textContent = objectDetected ? 'Person detected' : 'No entry detected';
  $('objectState').className = `state-chip ${objectDetected ? 'detected' : 'neutral'}`;
  $('objectBar').style.width = objectDetected ? '100%' : '12%';
  $('acStatus').textContent = objectDetected ? 'ON' : 'OFF';
  $('acStatus').style.color = objectDetected ? '#2a9a72' : '#718096';
  $('acState').textContent = objectDetected ? 'Person detected' : 'Room empty';
  $('acState').className = `state-chip ${objectDetected ? 'good' : 'neutral'}`;
  $('acBar').style.width = objectDetected ? '100%' : '12%';
  $('tempState').textContent = temperature >= 35 ? 'High' : temperature <= 18 ? 'Low' : 'Normal';
  $('humidityState').textContent = humidity < 30 || humidity > 70 ? 'Check level' : 'Comfortable';
  $('environmentHealth').textContent = roomStatus(temperature, humidity);
  $('acSummary').textContent = objectDetected ? 'AC is on because a person is detected' : 'AC is off because the room is empty';
  $('lastUpdated').textContent = timeLabel();
  history.push({ time: timeLabel(), temperature, humidity, object: objectDetected });
  if (history.length > 12) history.shift();
  environmentChart.data.labels = history.map(x => x.time);
  environmentChart.data.datasets[0].data = history.map(x => x.temperature);
  environmentChart.data.datasets[1].data = history.map(x => x.humidity);
  environmentChart.update('none');
  renderTable();
}

for (let i = 11; i >= 0; i--) {
  history.push({ time: timeLabel(new Date(Date.now() - i * 150000)), temperature: +(23 + Math.random() * 3).toFixed(1), humidity: +(50 + Math.random() * 10).toFixed(1), object: false });
}
temperature = history.at(-1).temperature;
humidity = history.at(-1).humidity;
objectDetected = false;
createChart();
updateDashboard(true);

function scheduleEntryCycle() {
  setTimeout(() => {
    updateDashboard(false, true);
    setTimeout(() => {
      updateDashboard(false, false);
      scheduleEntryCycle();
    }, 2000);
  }, 5000);
}

scheduleEntryCycle();
