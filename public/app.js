const $ = (id) => document.getElementById(id);
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
const number = (value) => new Intl.NumberFormat("id-ID").format(value);
const icon = (name) =>
  `<svg class="icon" aria-hidden="true"><use href="/icons.svg#${name}"></use></svg>`;
const labels = {
  heroes: "Hero",
  skins: "Skin",
  collection: "Koleksi",
  players: "Player",
  statistics: "Statistik",
};
const roles = ["TANK", "FIGHTER", "ASSASSIN", "MAGE", "MARKSMAN", "SUPPORT"];
const rarities = [
  "COMMON",
  "EXCEPTIONAL",
  "DELUXE",
  "EXQUISITE",
  "GRAND",
  "SUPREME",
];
const titleCase = (value) =>
  value ? value[0] + value.slice(1).toLowerCase() : "";
const state = {
  route: "heroes",
  players: [],
  player: null,
  playerId: Number(localStorage.getItem("mlbb-player") || 3),
  page: 1,
  limit: 18,
  role: "",
  search: "",
  rarity: "",
  skinHero: "",
  artwork: { heroes: {}, skins: {} },
  allHeroes: [],
  hero: null,
  currency: "BP",
};
const heroCache = new Map();
let requestVersion = 0;
let searchTimer;

async function api(method, path, body) {
  const response = await fetch(path, {
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  if (!response.ok || !result.status)
    throw new Error(result.message || `Request gagal (${response.status})`);
  return result;
}

function toast(message, error = false) {
  const element = document.createElement("div");
  element.className = `toast${error ? " error" : ""}`;
  element.innerHTML =
    icon(error ? "close" : "check") + `<span>${escape(message)}</span>`;
  $("toasts").append(element);
  setTimeout(() => element.remove(), 4200);
}

function fail(error) {
  $("main").innerHTML =
    `<div class="error-state"><strong>${escape(error.message)}</strong><p>Periksa terminal server dan koneksi database, lalu coba lagi.</p><button class="button" data-reload>Muat ulang</button></div>`;
}

function imageForHero(hero, className = "") {
  const image = state.artwork.heroes[String(hero.id)]?.src;
  return image
    ? `<img class="${className}" src="${escape(image)}" alt="${escape(hero.name)}" loading="lazy">`
    : `<div class="art-letter">${escape(hero.name[0])}</div>`;
}

function imageForSkin(skin) {
  const image = state.artwork.skins[String(skin.id)]?.src;
  return image
    ? `<img src="${escape(image)}" alt="${escape(skin.name)}" loading="lazy">`
    : `<div class="art-letter">${icon("diamond")}</div>`;
}

function owned(id) {
  return state.player?.heroes?.some((hero) => hero.heroId === id) || false;
}

function heroCard(hero, receipt) {
  return `<article class="hero-card"><button class="card-link" data-hero="${hero.id}" aria-label="Detail ${escape(hero.name)}"><div class="card-art">${imageForHero(hero)}${owned(hero.id) ? `<span class="owned-tag">${icon("check")}Dimiliki</span>` : ""}</div><div class="card-info"><span class="card-role">${escape(hero.role)}</span><h3>${escape(hero.name)}</h3>${receipt ? `<div class="owned-price">${icon(receipt.currency === "BP" ? "coin" : "diamond")}Dibeli ${number(receipt.pricePaid)} ${receipt.currency}</div>` : `<div class="card-prices"><span class="bp-price${hero.priceBP === null ? " unavailable" : ""}">${icon("coin")}${hero.priceBP === null ? "—" : number(hero.priceBP)}</span><span class="diamond-price${hero.priceDiamond === null ? " unavailable" : ""}">${icon("diamond")}${hero.priceDiamond === null ? "—" : number(hero.priceDiamond)}</span></div>`}</div></button></article>`;
}

function skinCard(skin) {
  return `<article class="hero-card skin-card"><button class="card-link" data-skin="${skin.id}" aria-label="Detail skin ${escape(skin.name)}"><div class="card-art">${imageForSkin(skin)}<span class="rarity-label">${escape(skin.rarity)}</span></div><div class="card-info"><span class="card-role">${escape(skin.hero.name)}</span><h3>${escape(skin.name)}</h3><div class="card-prices">${skin.priceDiamond === null ? "<span>Harga tidak tersedia</span>" : `<span class="diamond-price">${icon("diamond")}${number(skin.priceDiamond)}</span>`}<span>Lihat detail</span></div></div></button></article>`;
}

function heading(title, description, tools = "") {
  return `<div class="breadcrumb">SHOP<span>/</span>${escape(title)}</div><section class="section-heading"><div><h1>${escape(title)}<span class="catalog-count" id="catalogCount"></span></h1><p>${description}</p></div>${tools}</section>`;
}

async function refreshPlayers(preferred) {
  const { data } = await api("GET", "/api/players");
  state.players = data;
  if (preferred) state.playerId = preferred;
  if (!data.some((player) => player.id === state.playerId))
    state.playerId = data[0]?.id || 0;
  $("playerSelect").innerHTML = data.length
    ? data
        .map(
          (player) =>
            `<option value="${player.id}" ${player.id === state.playerId ? "selected" : ""}>${escape(player.nickname)}</option>`,
        )
        .join("")
    : '<option value="0">Belum ada player</option>';
  state.player = state.playerId
    ? (await api("GET", `/api/players/${state.playerId}`)).data
    : null;
  localStorage.setItem("mlbb-player", String(state.playerId));
  $("avatar").textContent = state.player?.nickname[0].toUpperCase() || "?";
  $("bpBalance").textContent = state.player ? number(state.player.bp) : "—";
  $("diamondBalance").textContent = state.player
    ? number(state.player.diamond)
    : "—";
  $("topupButton").disabled = !state.player;
}

async function renderPage() {
  document
    .querySelectorAll("[data-route]")
    .forEach((link) =>
      link.classList.toggle("active", link.dataset.route === state.route),
    );
  document.title = `${labels[state.route]} — MLBB Shop`;
  try {
    if (state.route === "heroes" || state.route === "skins") {
      const isHero = state.route === "heroes";
      $("main").innerHTML =
        heading(
          isHero ? "Hero" : "Skin",
          isHero
            ? "Temukan hero untuk lane dan gaya mainmu."
            : "Jelajahi tampilan hero favoritmu.",
          isHero
            ? `<label class="catalog-search">${icon("search")}<input id="heroSearch" type="search" placeholder="Cari hero…" aria-label="Cari hero" value="${escape(state.search)}"></label>`
            : `<div class="filter-selects"><select id="skinHero" aria-label="Filter hero skin"><option value="">Semua hero</option>${state.allHeroes.map((hero) => `<option value="${hero.id}" ${String(hero.id) === state.skinHero ? "selected" : ""}>${escape(hero.name)}</option>`).join("")}</select><select id="skinRarity" aria-label="Filter rarity"><option value="">Semua rarity</option>${rarities.map((rarity) => `<option ${state.rarity === rarity ? "selected" : ""} value="${rarity}">${titleCase(rarity)}</option>`).join("")}</select></div>`,
        ) +
        (isHero && !state.search && !state.role
          ? `<section class="featured"><div class="featured-copy"><span class="eyebrow">PILIHAN UNTUK GOLD LANE</span><h2>LAYLA</h2><p class="featured-description">Jaga jarak. Temukan posisi. Mulai koleksi pertamamu bersama sang Energy Gunner.</p><div class="featured-price">${icon("coin")}2.000 BP</div><div class="featured-actions"><button data-hero="18">Lihat hero ${icon("arrow-right")}</button></div></div><div class="featured-art"><img src="/assets/heroes/18.webp" alt="Layla, Energy Gunner"><span class="featured-caption">MARKSMAN / GOLD</span></div></section>`
          : "") +
        `<div class="catalog-toolbar" id="catalogToolbar">${isHero ? `<div class="role-tabs"><button data-role="" class="${!state.role ? "active" : ""}">Semua hero</button>${roles.map((role) => `<button data-role="${role}" class="${state.role === role ? "active" : ""}">${titleCase(role)}</button>`).join("")}</div><span class="currency-note">${icon("coin")}Battle Point ${icon("diamond")}Diamond</span>` : '<span class="currency-note">Galeri skin</span><span class="currency-note">Skin tersedia untuk dilihat.</span>'}</div><div id="catalogGrid" class="catalog-grid"></div><div id="pagination"></div>`;
      if (isHero)
        $("heroSearch").addEventListener("input", (event) => {
          state.search = event.target.value;
          state.page = 1;
          clearTimeout(searchTimer);
          searchTimer = setTimeout(loadCatalog, 220);
        });
      else {
        $("skinHero").addEventListener("change", (event) => {
          state.skinHero = event.target.value;
          state.page = 1;
          loadCatalog();
        });
        $("skinRarity").addEventListener("change", (event) => {
          state.rarity = event.target.value;
          state.page = 1;
          loadCatalog();
        });
      }
      await loadCatalog();
    } else if (state.route === "collection") {
      const version = ++requestVersion;
      const receipts = state.player?.heroes || [];
      const heroes = await Promise.all(
        receipts.map((receipt) => getHero(receipt.heroId)),
      );
      if (version !== requestVersion) return;
      $("main").innerHTML =
        heading(
          "Koleksi",
          state.player
            ? `Hero milik ${escape(state.player.nickname)}.`
            : "Pilih atau buat player untuk mulai mengoleksi.",
          `<button class="button secondary" data-action="match">${icon("swords")}Hadiah match</button>`,
        ) +
        (heroes.length
          ? `<div class="catalog-grid">${heroes.map((hero, index) => heroCard(hero, receipts[index])).join("")}</div>`
          : `<div class="empty-state">${icon("shield")}<strong>Koleksi pertamamu dimulai di sini.</strong><p>Gunakan BP atau Diamond untuk membeli hero.</p><a href="#heroes" class="button">Jelajahi hero ${icon("arrow-right")}</a></div>`);
    } else if (state.route === "players") {
      ++requestVersion;
      $("main").innerHTML =
        heading(
          "Player",
          "Pilih player dan kelola nickname.",
          `<div class="page-tools"><button class="button secondary" data-action="match">${icon("swords")}Hadiah match</button><button class="button primary" data-action="create">${icon("plus")}Player baru</button></div>`,
        ) +
        `<div class="table-scroll"><table class="players-table"><thead><tr><th>Player</th><th>Battle Point</th><th>Diamond</th><th>Tanggal dibuat</th><th></th></tr></thead><tbody>${state.players.map((player) => `<tr><td><div class="player-name"><span class="avatar">${escape(player.nickname[0].toUpperCase())}</span><div><strong>${escape(player.nickname)}</strong>${player.id === state.playerId ? '<span class="active-player-badge">Aktif</span>' : ""}<small>Player #${player.id}</small></div></div></td><td><span class="wallet bp-wallet">${icon("coin")}${number(player.bp)}</span></td><td><span class="wallet diamond-wallet">${icon("diamond")}${number(player.diamond)}</span></td><td>${new Date(player.createdAt).toLocaleDateString("id-ID")}</td><td class="player-row-actions">${player.id !== state.playerId ? `<button class="text-button" data-switch="${player.id}">Gunakan</button>` : ""}<button class="text-button" data-edit="${player.id}" aria-label="Edit ${escape(player.nickname)}">${icon("edit")}Edit</button><button class="text-button" data-delete="${player.id}" aria-label="Hapus ${escape(player.nickname)}">${icon("trash")}Hapus</button></td></tr>`).join("")}</tbody></table></div>`;
    } else {
      const version = ++requestVersion;
      const { data } = await api("GET", "/api/statistics");
      if (version !== requestVersion) return;
      const max = Math.max(...data.heroesPerRole.map((role) => role.total), 1);
      $("main").innerHTML =
        heading(
          "Statistik",
          "Ringkasan player dan kepemilikan hero.",
          `<button class="button" data-reload>Muat ulang</button>`,
        ) +
        `<section class="stats-overview"><div class="stat-item"><span>Total player</span><strong>${number(data.totalPlayers)}</strong></div><div class="stat-item"><span>Hero dimiliki player</span><strong>${number(data.totalHeroesOwned)}</strong></div><div class="stat-item"><span>Total saldo Diamond</span><strong>${number(data.totalDiamond)}</strong></div></section><div class="statistics-columns"><section><h2>Hero berdasarkan role</h2>${data.heroesPerRole.map((row) => `<div class="role-stat"><span>${titleCase(row.role)}</span><span class="role-bar"><i style="width:${(row.total / max) * 100}%"></i></span><strong>${number(row.total)}</strong></div>`).join("")}</section><section><h2>Paling banyak dimiliki</h2>${data.mostOwnedHero ? `<div class="popular-hero">${imageForHero({ id: data.mostOwnedHero.heroId, name: data.mostOwnedHero.name })}<div><span class="eyebrow">PLAYER'S CHOICE</span><h3>${escape(data.mostOwnedHero.name)}</h3><p>${number(data.mostOwnedHero.owners)} player memiliki hero ini.</p><button class="text-button" data-hero="${data.mostOwnedHero.heroId}">Lihat hero ${icon("arrow-right")}</button></div></div>` : '<p class="section-info">Belum ada hero yang dimiliki player.</p>'}</section></div>`;
    }
    bindImageErrors();
  } catch (error) {
    fail(error);
  }
}

async function loadCatalog() {
  const route = state.route;
  const version = ++requestVersion;
  const params = new URLSearchParams({ page: state.page, limit: state.limit });
  if (route === "heroes") {
    if (state.search) params.set("search", state.search);
    if (state.role) params.set("role", state.role);
  } else {
    if (state.skinHero) params.set("heroId", state.skinHero);
    if (state.rarity) params.set("rarity", state.rarity);
  }
  try {
    const { data, metadata } = await api("GET", `/api/${route}?${params}`);
    if (version !== requestVersion || route !== state.route) return;
    $("catalogCount").textContent =
      `${number(metadata.totalItems)} ${route === "heroes" ? "hero" : "skin"}`;
    $("catalogGrid").className = data.length ? "catalog-grid" : "empty-state";
    $("catalogGrid").innerHTML = data.length
      ? data
          .map(route === "heroes" ? (hero) => heroCard(hero) : skinCard)
          .join("")
      : `${icon("search")}<strong>Tidak ada hasil.</strong><p>Coba filter atau kata pencarian lain.</p>`;
    $("pagination").innerHTML =
      `<div class="pagination"><span>${metadata.totalItems ? (state.page - 1) * state.limit + 1 : 0}–${Math.min(state.page * state.limit, metadata.totalItems)} dari ${number(metadata.totalItems)} ${route === "heroes" ? "hero" : "skin"}</span><div class="pagination-controls"><button class="page-button" data-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""} aria-label="Halaman sebelumnya">${icon("arrow-left")}</button><span class="page-number">${state.page} / ${Math.max(1, metadata.totalPages)}</span><button class="page-button" data-page="${state.page + 1}" ${state.page >= metadata.totalPages ? "disabled" : ""} aria-label="Halaman berikutnya">${icon("arrow-right")}</button></div></div>`;
    bindImageErrors();
  } catch (error) {
    if (version === requestVersion) fail(error);
  }
}

async function getHero(id) {
  if (!heroCache.has(id))
    heroCache.set(id, (await api("GET", `/api/heroes/${id}`)).data);
  return heroCache.get(id);
}

async function openHero(id) {
  try {
    state.hero = await getHero(id);
    state.currency = state.hero.priceBP !== null ? "BP" : "DIAMOND";
    renderHeroDetail();
    $("heroDialog").showModal();
  } catch (error) {
    toast(error.message, true);
  }
}

function renderHeroDetail() {
  const hero = state.hero;
  const hasHero = owned(hero.id);
  const currency = state.currency;
  const price = currency === "BP" ? hero.priceBP : hero.priceDiamond;
  const balance = state.player
    ? currency === "BP"
      ? state.player.bp
      : state.player.diamond
    : 0;
  const canBuy =
    !!state.player && !hasHero && price !== null && balance >= price;
  $("heroDetail").innerHTML =
    `<div class="detail-top"><div class="detail-art">${imageForHero(hero)}</div><div class="detail-copy"><span class="eyebrow">${escape(hero.role)}</span><h2>${escape(hero.name)}</h2><div class="hero-meta"><span>${escape(hero.lane)} lane</span><span>${hero.releaseYear}</span></div>${
      hasHero
        ? `<div class="owned-message">${icon("check")}Sudah ada di koleksimu</div>`
        : `<p class="purchase-label">Pilih mata uang</p><div class="currency-options">${[
            "BP",
            "DIAMOND",
          ]
            .map((value) => {
              const cost = value === "BP" ? hero.priceBP : hero.priceDiamond;
              return `<button class="currency-option ${currency === value ? "selected" : ""}" data-currency="${value}" ${cost === null ? "disabled" : ""}>${icon(value === "BP" ? "coin" : "diamond")}<span>${cost === null ? "Tidak tersedia" : `${number(cost)} ${value === "BP" ? "BP" : "Diamond"}`}</span></button>`;
            })
            .join(
              "",
            )}</div><p class="after-balance">${!state.player ? "Buat atau pilih player terlebih dahulu." : price === null ? "Mata uang ini tidak tersedia." : balance < price ? `Saldo ${currency} belum cukup.` : `Saldo setelah pembelian: ${number(balance - price)} ${currency}`}</p><div id="purchaseError" class="detail-error" hidden></div><button class="button primary purchase-button" data-purchase ${!canBuy ? "disabled" : ""}>Beli dengan ${currency === "BP" ? "BP" : "Diamond"} ${icon("arrow-right")}</button>`
    }</div></div><section class="dialog-skins"><h3>Skin ${escape(hero.name)} <span class="catalog-count">${hero.skins.length} tampilan</span></h3><p>Jelajahi skin yang tersedia untuk hero ini.</p><div class="skin-strip">${hero.skins.map((skin) => `<button class="skin-preview text-button" data-skin="${skin.id}" aria-label="Lihat skin ${escape(skin.name)}"><span>${imageForSkin(skin)}<span>${escape(skin.name)}</span></span></button>`).join("") || '<span class="skin-caption">Belum ada skin untuk hero ini.</span>'}</div></section>`;
  bindImageErrors();
}

function modal(title, description, content, submitLabel, submit) {
  $("actionContent").innerHTML =
    `<form id="actionForm"><header><span class="eyebrow">MLBB SHOP</span><h2>${title}</h2><p>${description}</p><button class="close-button" type="button" data-close="actionDialog" aria-label="Tutup dialog">${icon("close")}</button></header><div class="dialog-form-content">${content}<div id="actionError" class="detail-error" hidden></div></div><footer class="modal-actions"><button class="button secondary" type="button" data-close="actionDialog">Batal</button><button class="button primary" type="submit" id="actionSubmit">${submitLabel}</button></footer></form>`;
  $("actionForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    $("actionSubmit").disabled = true;
    $("actionError").hidden = true;
    try {
      await submit(new FormData(event.target));
      $("actionDialog").close();
      await refreshPlayers();
      await renderPage();
    } catch (error) {
      $("actionError").textContent = error.message;
      $("actionError").hidden = false;
    } finally {
      if ($("actionSubmit")) $("actionSubmit").disabled = false;
    }
  });
  $("actionDialog").showModal();
}

function openAction(type, player) {
  if (type === "topup") {
    if (!state.player) return;
    modal(
      "Top up Diamond",
      `Untuk ${escape(state.player.nickname)}.`,
      `<div class="form-field"><label for="amount">Jumlah Diamond</label><input name="amount" id="amount" type="number" min="1" max="2147483647" step="1" value="706" required><div class="amount-choices">${[86, 172, 706].map((amount) => `<button type="button" data-amount="${amount}">${amount} Diamond</button>`).join("")}</div><small>Saldo saat ini: ${number(state.player.diamond)} Diamond.</small></div>`,
      "Tambahkan Diamond",
      async (form) => {
        const result = await api(
          "POST",
          `/api/players/${state.playerId}/topup`,
          { amount: Number(form.get("amount")) },
        );
        toast(`${result.data.amount} Diamond ditambahkan.`);
      },
    );
  } else if (type === "match") {
    if (!state.player) return toast("Buat player terlebih dahulu.", true);
    modal(
      "Hadiah match",
      `Catat hasil match ${escape(state.player.nickname)}.`,
      `<div class="match-options"><label class="match-option"><input type="radio" name="result" value="WIN" checked><strong>WIN</strong><span>+300 BP</span></label><label class="match-option"><input type="radio" name="result" value="LOSE"><strong>LOSE</strong><span>+100 BP</span></label></div>`,
      "Ambil hadiah",
      async (form) => {
        const result = await api(
          "POST",
          `/api/players/${state.playerId}/matches`,
          { result: form.get("result") },
        );
        toast(`Hadiah ${number(result.data.bpEarned)} BP ditambahkan.`);
      },
    );
  } else if (type === "delete") {
    modal(
      "Hapus player?",
      `${escape(player.nickname)} dan seluruh kepemilikan heronya akan dihapus.`,
      '<p class="section-info">Pastikan kamu memilih player yang benar.</p>',
      "Hapus player",
      async () => {
        await api("DELETE", `/api/players/${player.id}`);
        toast("Player berhasil dihapus.");
      },
    );
  } else {
    modal(
      type === "create" ? "Player baru" : "Edit nickname",
      type === "create"
        ? "Mulai dengan 10.000 BP dan 0 Diamond."
        : `Player #${player.id}.`,
      `<div class="form-field"><label for="nickname">Nickname</label><input id="nickname" name="nickname" value="${type === "create" ? "" : escape(player.nickname)}" maxlength="60" required placeholder="Masukkan nickname"></div>`,
      type === "create" ? "Buat player" : "Simpan perubahan",
      async (form) => {
        const result = await api(
          type === "create" ? "POST" : "PATCH",
          type === "create" ? "/api/players" : `/api/players/${player.id}`,
          { nickname: form.get("nickname").trim() },
        );
        if (type === "create") state.playerId = result.data.id;
        toast(result.message);
      },
    );
  }
}

async function openSkin(id) {
  try {
    const { data } = await api("GET", `/api/skins/${id}`);
    $("actionContent").innerHTML =
      `<button class="close-button" type="button" data-close="actionDialog" aria-label="Tutup detail skin">${icon("close")}</button><div class="skin-detail">${imageForSkin(data)}<span class="eyebrow">${escape(data.rarity)}</span><h2>${escape(data.name)}</h2><p>${escape(data.hero.name)} / ${data.priceDiamond === null ? "Harga Diamond tidak tersedia" : number(data.priceDiamond) + " Diamond"}</p></div>`;
    $("actionDialog").showModal();
    bindImageErrors();
  } catch (error) {
    toast(error.message, true);
  }
}

function bindImageErrors() {
  document.querySelectorAll("img").forEach((image) =>
    image.addEventListener("error", () => image.classList.add("failed"), {
      once: true,
    }),
  );
}

document.addEventListener("click", async (event) => {
  const target = event.target.closest("button,[data-close]");
  if (!target) return;
  try {
    if (target.dataset.close) return $(target.dataset.close).close();
    if (target.dataset.hero) return openHero(Number(target.dataset.hero));
    if (target.dataset.skin) return openSkin(Number(target.dataset.skin));
    if (target.dataset.currency) {
      state.currency = target.dataset.currency;
      return renderHeroDetail();
    }
    if (target.hasAttribute("data-purchase")) {
      target.disabled = true;
      try {
        const result = await api(
          "POST",
          `/api/players/${state.playerId}/heroes`,
          { heroId: state.hero.id, currency: state.currency },
        );
        await refreshPlayers();
        renderHeroDetail();
        await renderPage();
        toast(`${result.data.hero.name} masuk ke koleksimu.`);
      } catch (error) {
        $("purchaseError").textContent = error.message;
        $("purchaseError").hidden = false;
        target.disabled = false;
      }
      return;
    }
    if (target.hasAttribute("data-role")) {
      state.role = target.dataset.role;
      state.page = 1;
      document
        .querySelectorAll("[data-role]")
        .forEach((button) =>
          button.classList.toggle("active", button === target),
        );
      return loadCatalog();
    }
    if (target.dataset.page) {
      state.page = Number(target.dataset.page);
      await loadCatalog();
      return $("catalogToolbar")?.scrollIntoView({ block: "start" });
    }
    if (target.dataset.amount) {
      $("amount").value = target.dataset.amount;
      return;
    }
    if (target.dataset.action) return openAction(target.dataset.action);
    if (target.dataset.edit)
      return openAction(
        "edit",
        state.players.find(
          (player) => player.id === Number(target.dataset.edit),
        ),
      );
    if (target.dataset.delete)
      return openAction(
        "delete",
        state.players.find(
          (player) => player.id === Number(target.dataset.delete),
        ),
      );
    if (target.dataset.switch) {
      await refreshPlayers(Number(target.dataset.switch));
      return renderPage();
    }
    if (target.hasAttribute("data-reload")) {
      return boot();
    }
  } catch (error) {
    toast(error.message, true);
  }
});

$("topupButton").addEventListener("click", () => openAction("topup"));
$("playerSelect").addEventListener("change", async (event) => {
  try {
    await refreshPlayers(Number(event.target.value));
    await renderPage();
  } catch (error) {
    toast(error.message, true);
  }
});
function navigate() {
  const value = location.hash.slice(1);
  state.route = Object.hasOwn(labels, value) ? value : "heroes";
  state.page = 1;
  renderPage();
}
window.addEventListener("hashchange", navigate);

async function boot() {
  try {
    const health = await api("GET", "/health");
    $("runtimeMode").textContent =
      health.data.mode === "local"
        ? "Mode demo lokal · data disimpan di komputer ini."
        : "Neon · database terhubung.";
    const [art, first] = await Promise.all([
      fetch("/assets/artwork.json").then((response) => response.json()),
      api("GET", "/api/heroes?limit=100"),
    ]);
    state.artwork = art;
    state.allHeroes = first.data;
    if (first.metadata.totalPages > 1)
      state.allHeroes.push(
        ...(await api("GET", "/api/heroes?limit=100&page=2")).data,
      );
    await refreshPlayers();
    navigate();
  } catch (error) {
    fail(error);
  }
}
await boot();
