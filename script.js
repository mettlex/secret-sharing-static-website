function buf2hex(buffer) {
  return Array.prototype.map
    .call(new Uint8Array(buffer), (x) => ("00" + x.toString(16)).slice(-2))
    .join("");
}

function hex2buf(hex) {
  var bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (var i = 0; i < bytes.length; i++)
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

let storedShares = [];

function split() {
  let password = document.getElementById("password").value;

  if (!password) {
    return;
  }

  let count = document.getElementById("count").value;
  let threshold = document.getElementById("threshold").value;

  let enc = new TextEncoder(); // always utf-8
  let data = enc.encode(password);
  if (data.length > 63) alert("Error: text too long (max 63 bytes)");

  let extData = new Uint8Array(64);
  extData.set(data, 0);
  extData[data.length] = 0x80;

  const sharesPromise = sss.createShares(
    extData,
    parseInt(count),
    parseInt(threshold),
  );

  sharesPromise.then((x) => {
    let outputElem = document.getElementById("shares");
    outputElem.value = "";

    const buttonsContainer = document.getElementById("share-buttons");

    buttonsContainer.innerHTML = "";

    for (i in x) {
      const hexValue = buf2hex(x[i]);

      storedShares.push(hexValue);

      const btn = document.createElement("button");

      btn.textContent = `Copy Share #${parseInt(i) + 1}`;

      btn.dataset.index = i;

      btn.addEventListener("click", () => {
        const i = parseInt(btn.dataset.index);
        const hex = storedShares[i];
        navigator.clipboard.writeText(hex);
        const oldValue = btn.textContent;
        btn.textContent = "Copied!";
        const tid = setTimeout(() => {
          btn.textContent = oldValue;
          clearTimeout(tid);
        }, 2000);
      });

      buttonsContainer.appendChild(btn);

      outputElem.value += hexValue + "\n\n";
    }
  });
}

function combine() {
  const sharesText = document.getElementById("shares").value;

  if (!sharesText) {
    return;
  }

  const lines = sharesText.split("\n").filter((x) => x);

  let shares = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (line) shares.push(hex2buf(line));
  }

  let restoredPromise = sss.combineShares(shares);

  restoredPromise
    .then((x) => {
      let i = 0;

      for (; i < x.length; i++) {
        if (x[i] == 0x80) break;
      }

      let dec = new TextDecoder("utf-8");
      let data = dec.decode(x.slice(0, i));

      let outputElem = document.getElementById("password");

      outputElem.value = data;
    })
    .catch((e) => alert(e));
}

(function load() {
  let splitButton = document.getElementById("split_btn");
  splitButton.addEventListener("click", split);

  let combineButton = document.getElementById("combine_btn");
  combineButton.addEventListener("click", combine);

  const messageBox = document.getElementById("message");
  const passwordBox = document.getElementById("password");
  const encryptedTextBox = document.getElementById("enc-textarea");

  passwordBox.addEventListener("focus", (event) => {
    event.target.select();
  });

  encryptedTextBox.addEventListener("focus", (event) => {
    event.target.select();
  });

  const encBtn = document.querySelector("#encrypt-btn");
  const decBtn = document.querySelector("#decrypt-btn");

  encBtn.addEventListener("click", async () => {
    const message = messageBox.value.trim();
    const password = passwordBox.value.trim();

    if (!message || !password) {
      return;
    }

    const ciphertext = await aesGcmEncrypt(message, password);

    encryptedTextBox.value = ciphertext;
  });

  decBtn.addEventListener("click", async () => {
    const ciphertext = encryptedTextBox.value.trim();
    const password = passwordBox.value.trim();

    if (!ciphertext || !password) {
      return;
    }

    const secret = await aesGcmDecrypt(ciphertext, password);

    messageBox.value = secret;
  });
})();
