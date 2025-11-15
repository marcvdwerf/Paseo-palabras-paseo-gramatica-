const fileInput = document.getElementById("file");
const preview = document.getElementById("preview");
const startBtn = document.getElementById("start");
const statusEl = document.getElementById("status");
const results = document.getElementById("results");

fileInput.onchange = () => {
  const f = fileInput.files[0];
  preview.src = URL.createObjectURL(f);
  preview.style.display = "block";
};

startBtn.onclick = async () => {
  const f = fileInput.files[0];
  if (!f) return alert("Eerst een foto uploaden!");

  statusEl.textContent = "AI analyseert...";
  results.innerHTML = "";

  const form = new FormData();
  form.append("photo", f);

  const r = await fetch("/api/analyze", {
    method: "POST",
    body: form
  });

  const data = await r.json();
  statusEl.textContent = "Klaar!";

  data.labels.forEach(item => {
    results.innerHTML += `
      <div class="result">
        <strong>${item.translation}</strong><br>
        NL: ${item.label}<br>
        ${item.description}
      </div>
    `;
  });
};
