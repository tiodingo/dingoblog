'use strict';

/**
 * Puxa os posts do Blogger e preenche as seções
 * "Escolhas do editor" (#featured) e "Posts recentes" (#recent).
 * Se o Blogger não responder, o conteúdo estático do HTML continua na página.
 */

const BLOG_URL = "https://tecnicorodrigo.blogspot.com";
const FEATURED_LABEL = "Destaque"; // marcador do Blogger usado nos destaques (se não existir, usa os posts seguintes)
const RECENT_COUNT = 5;
const FEATURED_COUNT = 5;
const SIDEBAR_COUNT = 5; // lista lateral de posts recentes
const FALLBACK_IMG = "./assets/images/recent-post-1.jpg";

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const sized = (url, size) => url ? url.replace(/\/s72-c\//, `/${size}-c/`) : FALLBACK_IMG;

const parsePost = (e) => {
  const link = (e.link.find((l) => l.rel === "alternate") || {}).href || BLOG_URL;
  const html = (e.content && e.content.$t) || (e.summary && e.summary.$t) || "";
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const thumb = e.media$thumbnail ? e.media$thumbnail.url : "";
  return {
    title: e.title.$t,
    link,
    labels: (e.category || []).map((c) => c.term),
    date: new Date(e.published.$t).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
    iso: e.published.$t.slice(0, 10),
    dateLong: new Date(e.published.$t).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }),
    minutes: Math.max(1, Math.round(text.split(" ").length / 200)),
    excerpt: text.length > 130 ? text.slice(0, 130).trim() + "…" : text,
    img: thumb || "",
    author: (e.author && e.author[0].name.$t) || "Técnico Rodrigo"
  };
};

const tagsHTML = (labels) => labels.slice(0, 2).map((l) =>
  `<a href="${BLOG_URL}/search/label/${encodeURIComponent(l)}" class="span hover-2"># ${esc(l)}</a>`).join("");

const readTimeHTML = (p) => `<div class="wrapper"><ion-icon name="time-outline" aria-hidden="true"></ion-icon><span class="span">${p.minutes} min de leitura</span></div>`;

const featuredCard = (p) => `
<li><div class="card feature-card">
  <figure class="card-banner img-holder" style="--width: 1602; --height: 903;">
    <img src="${esc(sized(p.img, "w1600-h900"))}" width="1602" height="903" loading="lazy" alt="${esc(p.title)}" class="img-cover">
  </figure>
  <div class="card-content">
    <div class="card-wrapper"><div class="card-tag">${tagsHTML(p.labels)}</div>${readTimeHTML(p)}</div>
    <h3 class="headline headline-3"><a href="${esc(p.link)}" class="card-title hover-2">${esc(p.title)}</a></h3>
    <div class="card-wrapper">
      <div class="profile-card">
        <img src="./assets/images/author-1.png" width="48" height="48" loading="lazy" alt="${esc(p.author)}" class="profile-banner">
        <div><p class="card-title">${esc(p.author)}</p><p class="card-subtitle">${esc(p.date)}</p></div>
      </div>
      <a href="${esc(p.link)}" class="card-btn">Leia mais</a>
    </div>
  </div>
</div></li>`;

const recentCard = (p) => `
<li><div class="recent-post-card">
  <figure class="card-banner img-holder" style="--width: 271; --height: 258;">
    <img src="${esc(sized(p.img, "w542-h516"))}" width="271" height="258" loading="lazy" alt="${esc(p.title)}" class="img-cover">
  </figure>
  <div class="card-content">
    ${p.labels[0] ? `<a href="${BLOG_URL}/search/label/${encodeURIComponent(p.labels[0])}" class="card-badge">${esc(p.labels[0])}</a>` : ""}
    <h3 class="headline headline-3 card-title"><a href="${esc(p.link)}" class="link hover-2">${esc(p.title)}</a></h3>
    <p class="card-text">${esc(p.excerpt)}</p>
    <div class="card-wrapper"><div class="card-tag">${tagsHTML(p.labels)}</div>${readTimeHTML(p)}</div>
  </div>
</div></li>`;

const popularCard = (p) => `
<li><div class="popular-card">
  <figure class="card-banner img-holder" style="--width: 64; --height: 64;">
    <img src="${esc(sized(p.img, "w128-h128"))}" width="64" height="64" loading="lazy" alt="${esc(p.title)}" class="img-cover">
  </figure>
  <div class="card-content">
    <h4 class="headline headline-4 card-title"><a href="${esc(p.link)}" class="link hover-2">${esc(p.title)}</a></h4>
    <div class="warpper">
      <p class="card-subtitle">${p.minutes} min de leitura</p>
      <time class="publish-date" datetime="${p.iso}">${esc(p.dateLong)}</time>
    </div>
  </div>
</div></li>`;

const tagCard = (label) => `
<li><a href="${BLOG_URL}/search/label/${encodeURIComponent(label)}" class="card tag-btn">
  <ion-icon name="pricetag-outline" aria-hidden="true"></ion-icon>
  <p class="btn-text">${esc(label)}</p>
</a></li>`;

const fillList = (selector, posts, template) => {
  const list = document.querySelector(selector);
  if (list && posts.length) list.innerHTML = posts.map(template).join("");
};

const render = (data) => {
  const posts = ((data.feed && data.feed.entry) || []).map(parsePost);
  console.log(`[blogger.js] ${posts.length} posts recebidos do Blogger`);
  if (!posts.length) return;

  const recent = posts.slice(0, RECENT_COUNT);
  const rest = posts.slice(RECENT_COUNT);
  let featured = posts.filter((p) => p.labels.includes(FEATURED_LABEL)).slice(0, FEATURED_COUNT);
  if (!featured.length) featured = rest.slice(0, FEATURED_COUNT);

  fillList("#featured .feature-list", featured, featuredCard);
  fillList("#recent .grid-list", recent, recentCard);
  fillList("#recent .popular-list", posts.slice(0, SIDEBAR_COUNT), popularCard);

  // Tags: todos os marcadores (labels) do Blogger
  const labels = ((data.feed && data.feed.category) || []).map((c) => c.term);
  fillList(".tags .grid-list", labels, tagCard);
};

/**
 * Carrega o feed por JSONP (tag <script>), que funciona mesmo abrindo
 * o index.html direto do disco e sem problemas de CORS.
 */
window.__bloggerCallback = (data) => {
  try { render(data); } catch (err) { console.error("[blogger.js] erro ao montar os posts:", err); }
};

const feedScript = document.createElement("script");
feedScript.src = `${BLOG_URL}/feeds/posts/default?alt=json-in-script&max-results=30&callback=__bloggerCallback`;
feedScript.onerror = () => console.warn("[blogger.js] não foi possível carregar o feed do Blogger. Confira se o feed do site está ativado.");
document.head.appendChild(feedScript);
