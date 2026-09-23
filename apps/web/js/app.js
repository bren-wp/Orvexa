(() => {
  'use strict';

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const MAX_SELECTION = 100;
  const PAGE_SIZE = 48;
  const STORAGE = Object.freeze({
    selection: 'orvexa:selection',
    favorites: 'orvexa:favorites',
    theme: 'orvexa:theme',
    os: 'orvexa:os'
  });

  const state = {
    config: null,
    product: null,
    catalog: { apps: [], revision: 0, lastUpdated: '' },
    categories: [],
    packs: [],
    operatingSystems: [],
    selected: new Set(),
    favorites: new Set(),
    category: 'all',
    filter: 'all',
    query: '',
    sort: 'featured',
    os: 'windows-11',
    theme: 'system',
    visibleLimit: PAGE_SIZE
  };

  const refs = {
    apps: $('#appsGrid'),
    empty: $('#emptyState'),
    categories: $('#categoryLinks'),
    allCount: $('#allCount'),
    search: $('#searchInput'),
    clearSearch: $('#clearSearchButton'),
    resetCatalog: $('#resetCatalogButton'),
    sort: $('#sortSelect'),
    resultsCount: $('#resultsCount'),
    loadMoreWrap: $('#loadMoreWrap'),
    loadMore: $('#loadMoreButton'),
    revision: $('#catalogRevision'),
    updated: $('#catalogUpdated'),
    packs: $('#packsGrid'),
    osLibrary: $('#osLibraryGrid'),
    tray: $('#selectionTray'),
    count: $('#selectionCount'),
    names: $('#selectionNames'),
    headerSelection: $('#headerSelectionButton'),
    headerSelectionCount: $('#headerSelectionCount'),
    review: $('#reviewModal'),
    reviewList: $('#reviewList'),
    download: $('#downloadModal'),
    downloadWindows: $('#downloadWindows'),
    downloadStatus: $('#downloadStatus'),
    theme: $('#themeToggle'),
    nav: $('#mainNav'),
    navToggle: $('#mobileNavToggle'),
    toast: $('#toast'),
    appCount: $('#catalogAppCount'),
    categoryCount: $('#catalogCategoryCount'),
    revisionHero: $('#catalogRevisionHero'),
    footerVersion: $('#footerVersion')
  };

  const systemTheme = matchMedia('(prefers-color-scheme: light)');

  async function boot() {
    loadLocalState();
    applyTheme();
    wireStaticActions();

    try {
      const [config, product, catalog, categories, packs, systems] = await Promise.all([
        fetchJson('data/config.json'),
        fetchJson('data/product.json'),
        fetchJson('data/catalog.json'),
        fetchJson('data/categories.json'),
        fetchJson('data/packs.json'),
        fetchJson('data/os-catalog.json')
      ]);

      state.config = config;
      state.product = product;
      state.catalog = normalizeCatalog(catalog);
      state.categories = Array.isArray(categories) ? categories : [];
      state.packs = Array.isArray(packs?.packs) ? packs.packs : [];
      state.operatingSystems = Array.isArray(systems?.systems) ? systems.systems : [];

      sanitizeStoredIds();
      pruneSelectionForOs(false);
      configureDownload();
      renderCategories();
      renderPacks();
      renderOperatingSystems();
      renderCatalogMeta();
      renderCatalog(true);
      updateSelectionUi();
      updateOsUi();
      updateVersionUi();
    } catch {
      showCatalogFailure();
    }
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok) throw new Error('Data unavailable');
    return response.json();
  }

  function normalizeCatalog(value) {
    const apps = Array.isArray(value?.apps) ? value.apps.filter(app => app && typeof app.id === 'string') : [];
    return {
      ...value,
      apps,
      revision: Number.isFinite(Number(value?.revision)) ? Number(value.revision) : 0,
      lastUpdated: typeof value?.lastUpdated === 'string' ? value.lastUpdated : ''
    };
  }

  function loadLocalState() {
    state.selected = readSet(STORAGE.selection);
    state.favorites = readSet(STORAGE.favorites);

    const savedTheme = safeStorageGet(STORAGE.theme);
    state.theme = ['system', 'light', 'dark'].includes(savedTheme) ? savedTheme : 'system';

    const savedOs = safeStorageGet(STORAGE.os);
    state.os = ['windows-11', 'windows-10'].includes(savedOs) ? savedOs : 'windows-11';
  }

  function readSet(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return new Set(Array.isArray(value) ? value.filter(x => typeof x === 'string') : []);
    } catch {
      return new Set();
    }
  }

  function safeStorageGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function safeStorageSet(key, value) {
    try { localStorage.setItem(key, value); } catch { }
  }

  function saveSet(key, value) {
    safeStorageSet(key, JSON.stringify([...value]));
  }

  function sanitizeStoredIds() {
    const allowed = new Set(state.catalog.apps.filter(x => x.enabled).map(x => x.id));
    state.selected = new Set([...state.selected].filter(x => allowed.has(x)).slice(0, MAX_SELECTION));
    state.favorites = new Set([...state.favorites].filter(x => allowed.has(x)));
    saveSet(STORAGE.selection, state.selected);
    saveSet(STORAGE.favorites, state.favorites);
  }

  function wireStaticActions() {
    refs.theme.addEventListener('click', cycleTheme);
    $('#windowsDownloadButton').addEventListener('click', openDownloadModal);
    $('#heroDownloadButton').addEventListener('click', openDownloadModal);
    $('#productDownloadButton').addEventListener('click', openDownloadModal);
    $('#clearSelection').addEventListener('click', clearSelection);
    $('#installSelected').addEventListener('click', openReview);
    $('#confirmInstall').addEventListener('click', confirmInstall);
    refs.headerSelection.addEventListener('click', openReview);

    refs.search.addEventListener('input', event => {
      state.query = event.target.value.trim().toLowerCase();
      refs.clearSearch.hidden = state.query.length === 0;
      resetVisibleLimit();
      renderCatalog();
    });

    refs.clearSearch.addEventListener('click', () => {
      state.query = '';
      refs.search.value = '';
      refs.clearSearch.hidden = true;
      refs.search.focus();
      resetVisibleLimit();
      renderCatalog();
    });

    refs.resetCatalog.addEventListener('click', resetCatalogControls);
    refs.sort.addEventListener('change', event => {
      state.sort = event.target.value;
      resetVisibleLimit();
      renderCatalog();
    });
    refs.loadMore.addEventListener('click', () => {
      state.visibleLimit += PAGE_SIZE;
      renderCatalog();
    });

    refs.navToggle.addEventListener('click', toggleMobileNav);
    refs.nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMobileNav));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeMobileNav();
    });

    $$('.os-card[data-os]').forEach(button =>
      button.addEventListener('click', () => selectOs(button.dataset.os))
    );

    $$('[data-close-modal]').forEach(button =>
      button.addEventListener('click', () => closeModal(button.dataset.closeModal))
    );

    $$('.modal').forEach(dialog => {
      dialog.addEventListener('click', event => {
        if (event.target === dialog) closeModal(dialog.id);
      });
    });

    $$('[data-filter]').forEach(button =>
      button.addEventListener('click', () => setFilter(button.dataset.filter))
    );

    systemTheme.addEventListener?.('change', () => {
      if (state.theme === 'system') applyTheme();
    });
  }

  function cycleTheme() {
    const order = ['system', 'light', 'dark'];
    state.theme = order[(order.indexOf(state.theme) + 1) % order.length];
    safeStorageSet(STORAGE.theme, state.theme);
    applyTheme();
  }

  function applyTheme() {
    const light = state.theme === 'light' || (state.theme === 'system' && systemTheme.matches);
    document.body.classList.toggle('light', light);
    document.documentElement.style.colorScheme = light ? 'light' : 'dark';
    refs.theme.textContent = `Theme: ${capitalize(state.theme)}`;
    refs.theme.setAttribute('aria-label', `Color theme ${state.theme}. Activate to change theme.`);
  }

  function toggleMobileNav() {
    const open = !refs.nav.classList.contains('open');
    refs.nav.classList.toggle('open', open);
    refs.navToggle.setAttribute('aria-expanded', String(open));
  }

  function closeMobileNav() {
    refs.nav.classList.remove('open');
    refs.navToggle.setAttribute('aria-expanded', 'false');
  }

  function selectOs(os) {
    if (!['windows-11', 'windows-10'].includes(os)) return;
    state.os = os;
    safeStorageSet(STORAGE.os, os);
    const removed = pruneSelectionForOs(true);
    updateOsUi();
    renderCategories();
    renderPacks();
    resetVisibleLimit();
    renderCatalog();
    updateSelectionUi();
    if (removed > 0) showToast(`${removed} incompatible selection${removed === 1 ? '' : 's'} removed.`);
  }

  function updateOsUi() {
    $$('.os-card[data-os]').forEach(button => {
      const active = button.dataset.os === state.os;
      button.classList.toggle('active', active);
      button.setAttribute('aria-checked', active ? 'true' : 'false');
      const label = button.querySelector('.selection-label');
      if (label) label.textContent = active ? 'Selected' : 'Select';
    });
  }

  function pruneSelectionForOs(save = true) {
    const before = state.selected.size;
    const compatible = new Set(
      state.catalog.apps
        .filter(app => app.enabled && supportsSelectedOs(app))
        .map(app => app.id)
    );
    state.selected = new Set([...state.selected].filter(id => compatible.has(id)));
    if (save) saveSet(STORAGE.selection, state.selected);
    return before - state.selected.size;
  }

  function renderCategories() {
    const enabled = state.catalog.apps.filter(app => app.enabled && supportsSelectedOs(app));
    refs.allCount.textContent = String(enabled.length);

    refs.categories.innerHTML = state.categories.map(category => {
      const count = enabled.filter(app => app.category === category.name).length;
      const icon = safeAssetPath(category.icon);
      return `<button class="category-link" type="button" data-category="${escapeHtml(category.id)}" aria-pressed="${state.category === category.id}">
        <span class="category-name"><img src="${icon}" alt="" width="18" height="18" loading="lazy"><span>${escapeHtml(category.name)}</span></span>
        <span>${count}</span>
      </button>`;
    }).join('');

    refs.categories.querySelectorAll('[data-category]').forEach(button =>
      button.addEventListener('click', () => setCategory(button.dataset.category))
    );

    const all = document.querySelector('[data-category="all"]');
    all.classList.toggle('active', state.category === 'all');
    all.setAttribute('aria-pressed', String(state.category === 'all'));
  }

  function setCategory(category) {
    if (category !== 'all' && !state.categories.some(item => item.id === category)) return;
    state.category = category;
    $$('[data-category]').forEach(button => {
      const active = button.dataset.category === category;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    resetVisibleLimit();
    renderCatalog();
  }

  function setFilter(filter) {
    if (!['all', 'popular', 'favorites', 'selected'].includes(filter)) return;
    state.filter = filter;
    $$('[data-filter]').forEach(button => {
      const active = button.dataset.filter === filter;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    resetVisibleLimit();
    renderCatalog();
  }

  function resetCatalogControls() {
    state.category = 'all';
    state.filter = 'all';
    state.query = '';
    state.sort = 'featured';
    refs.search.value = '';
    refs.clearSearch.hidden = true;
    refs.sort.value = 'featured';

    $$('[data-category]').forEach(button => {
      const active = button.dataset.category === 'all';
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $$('[data-filter]').forEach(button => {
      const active = button.dataset.filter === 'all';
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    resetVisibleLimit();
    renderCatalog();
  }

  function supportsSelectedOs(app) {
    return !Array.isArray(app.platforms) ||
      app.platforms.length === 0 ||
      app.platforms.includes(state.os);
  }

  function visibleApps() {
    let apps = state.catalog.apps.filter(app => app.enabled && supportsSelectedOs(app));

    if (state.category !== 'all') {
      const category = state.categories.find(item => item.id === state.category);
      if (category) apps = apps.filter(app => app.category === category.name);
    }

    if (state.filter === 'popular') apps = apps.filter(app => app.popular);
    if (state.filter === 'favorites') apps = apps.filter(app => state.favorites.has(app.id));
    if (state.filter === 'selected') apps = apps.filter(app => state.selected.has(app.id));

    if (state.query) {
      apps = apps.filter(app => {
        const haystack = [
          app.name,
          app.publisher,
          app.category,
          app.description,
          app.id,
          app.wingetId
        ].join(' ').toLowerCase();
        return haystack.includes(state.query);
      });
    }

    return sortApps(apps);
  }

  function sortApps(apps) {
    const copy = [...apps];
    if (state.sort === 'name') {
      return copy.sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' }));
    }
    if (state.sort === 'publisher') {
      return copy.sort((a, b) =>
        String(a.publisher || '').localeCompare(String(b.publisher || ''), undefined, { sensitivity: 'base' }) ||
        String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' })
      );
    }

    return copy.sort((a, b) =>
      Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
      Number(Boolean(b.popular)) - Number(Boolean(a.popular)) ||
      String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' })
    );
  }

  function resetVisibleLimit() {
    state.visibleLimit = PAGE_SIZE;
  }

  function renderCatalog() {
    const all = visibleApps();
    const visible = all.slice(0, state.visibleLimit);

    refs.empty.hidden = all.length !== 0;
    refs.apps.hidden = all.length === 0;
    refs.apps.innerHTML = visible.map(cardHtml).join('');

    refs.resultsCount.textContent = all.length === 0
      ? 'No matching apps'
      : `Showing ${visible.length} of ${all.length} app${all.length === 1 ? '' : 's'}`;

    refs.loadMoreWrap.hidden = visible.length >= all.length;
    if (!refs.loadMoreWrap.hidden) {
      refs.loadMore.textContent = `Show ${Math.min(PAGE_SIZE, all.length - visible.length)} more`;
    }

    refs.apps.querySelectorAll('[data-select-app]').forEach(button =>
      button.addEventListener('click', () => toggleSelection(button.dataset.selectApp))
    );
    refs.apps.querySelectorAll('[data-favorite-app]').forEach(button =>
      button.addEventListener('click', () => toggleFavorite(button.dataset.favoriteApp))
    );
  }

  function cardHtml(app) {
    const selected = state.selected.has(app.id);
    const favorite = state.favorites.has(app.id);
    const icon = safeAssetPath(app.icon);
    const publisher = app.publisher || app.category || 'Publisher';
    const version = app.versionLabel || 'Latest available';

    return `<article class="app-card${selected ? ' selected' : ''}">
      <div class="app-card-top">
        <img class="app-icon" src="${icon}" alt="" width="44" height="44" loading="lazy" decoding="async">
        <div class="app-title">
          <strong>${escapeHtml(app.name)}</strong>
          <small>${escapeHtml(publisher)}</small>
        </div>
      </div>
      <p class="app-description">${escapeHtml(app.description || '')}</p>
      <div class="app-meta">
        <span>${escapeHtml(app.category || 'Software')}</span>
        <span>${escapeHtml(version)}</span>
        <span>${escapeHtml(app.wingetId || app.id)}</span>
      </div>
      <div class="app-actions">
        <button class="${selected ? 'secondary-button' : 'primary-button'} compact" type="button"
          data-select-app="${escapeHtml(app.id)}" aria-pressed="${selected}">
          ${selected ? 'Remove' : 'Select'}
        </button>
        <button class="ghost-button compact" type="button"
          data-favorite-app="${escapeHtml(app.id)}" aria-pressed="${favorite}">
          ${favorite ? 'Saved' : 'Favorite'}
        </button>
      </div>
    </article>`;
  }

  function toggleSelection(id) {
    const app = findEnabledApp(id);
    if (!app || !supportsSelectedOs(app)) return;

    if (state.selected.has(id)) {
      state.selected.delete(id);
    } else {
      if (state.selected.size >= MAX_SELECTION) {
        showToast(`A maximum of ${MAX_SELECTION} apps can be handed to Orvexa at once.`);
        return;
      }
      state.selected.add(id);
    }

    saveSet(STORAGE.selection, state.selected);
    renderCatalog();
    updateSelectionUi();
  }

  function toggleFavorite(id) {
    if (!findEnabledApp(id)) return;
    state.favorites.has(id) ? state.favorites.delete(id) : state.favorites.add(id);
    saveSet(STORAGE.favorites, state.favorites);
    renderCatalog();
  }

  function clearSelection() {
    state.selected.clear();
    saveSet(STORAGE.selection, state.selected);
    renderCatalog();
    updateSelectionUi();
    showToast('Selection cleared.');
  }

  function updateSelectionUi() {
    const selected = state.catalog.apps.filter(app => state.selected.has(app.id));
    const hasSelection = selected.length > 0;

    refs.tray.hidden = !hasSelection;
    refs.headerSelection.hidden = !hasSelection;
    refs.count.textContent = String(selected.length);
    refs.headerSelectionCount.textContent = String(selected.length);

    refs.names.textContent = hasSelection
      ? selected.slice(0, 3).map(app => app.name).join(', ') +
        (selected.length > 3 ? ` and ${selected.length - 3} more` : '')
      : 'Ready to review';
  }

  function renderPacks() {
    refs.packs.innerHTML = state.packs.map(pack => {
      const compatibleCount = Array.isArray(pack.apps)
        ? pack.apps.filter(id => {
            const app = findEnabledApp(id);
            return app && supportsSelectedOs(app);
          }).length
        : 0;

      return `<button class="pack-card${pack.recommended ? ' recommended' : ''}" type="button" data-pack="${escapeHtml(pack.id)}">
        <strong>${escapeHtml(pack.name)}</strong>
        <p>${escapeHtml(pack.description)}</p>
        <span>${compatibleCount} compatible app${compatibleCount === 1 ? '' : 's'}${pack.recommended ? ' · Recommended' : ''}</span>
      </button>`;
    }).join('');

    refs.packs.querySelectorAll('[data-pack]').forEach(button =>
      button.addEventListener('click', () => applyPack(button.dataset.pack))
    );
  }

  function applyPack(id) {
    const pack = state.packs.find(item => item.id === id);
    if (!pack || !Array.isArray(pack.apps)) return;

    let added = 0;
    let skipped = 0;

    for (const appId of pack.apps) {
      const app = findEnabledApp(appId);
      if (!app || !supportsSelectedOs(app)) {
        skipped++;
        continue;
      }
      if (state.selected.has(appId)) continue;
      if (state.selected.size >= MAX_SELECTION) {
        skipped++;
        continue;
      }
      state.selected.add(appId);
      added++;
    }

    saveSet(STORAGE.selection, state.selected);
    renderCatalog();
    updateSelectionUi();

    const message = skipped > 0
      ? `${pack.name}: ${added} added, ${skipped} skipped.`
      : `${pack.name}: ${added} added to your selection.`;
    showToast(message);
  }

  function renderOperatingSystems() {
    const systems = state.operatingSystems.filter(os => os.type === 'Windows');
    refs.osLibrary.innerHTML = systems.map(os => {
      const url = safeMicrosoftUrl(os.url);
      const link = url
        ? `<a class="ghost-button compact" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Official Microsoft page</a>`
        : '';
      return `<article class="os-download">
        <strong>${escapeHtml(os.name)}</strong>
        <p>${escapeHtml(os.description)}</p>
        ${link}
      </article>`;
    }).join('');
  }

  function renderCatalogMeta() {
    refs.revision.textContent = `Revision ${state.catalog.revision}`;
    refs.revisionHero.textContent = String(state.catalog.revision || '—');

    const enabled = state.catalog.apps.filter(app => app.enabled);
    refs.appCount.textContent = String(enabled.length);
    refs.categoryCount.textContent = String(state.categories.length);

    const date = new Date(state.catalog.lastUpdated);
    refs.updated.textContent = Number.isNaN(date.getTime())
      ? 'Updated recently'
      : `Updated ${new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(date)}`;
  }

  function updateVersionUi() {
    const version = typeof state.product?.version === 'string' ? state.product.version : '0.0.2';
    refs.footerVersion.textContent = `Version ${version}`;
  }

  function openReview() {
    const selected = state.catalog.apps.filter(app => state.selected.has(app.id) && app.enabled && supportsSelectedOs(app));
    if (!selected.length) {
      showToast('Choose at least one compatible app first.');
      return;
    }

    refs.reviewList.innerHTML = selected.map(app =>
      `<div class="review-item">
        <img src="${safeAssetPath(app.icon)}" alt="" width="36" height="36" loading="lazy">
        <div><strong>${escapeHtml(app.name)}</strong><small>${escapeHtml(app.publisher || app.category || '')}</small></div>
      </div>`
    ).join('');

    showDialog(refs.review);
  }

  function confirmInstall() {
    const ids = state.catalog.apps
      .filter(app => state.selected.has(app.id) && app.enabled && supportsSelectedOs(app))
      .slice(0, MAX_SELECTION)
      .map(app => app.id);

    if (!ids.length) return;

    const protocol = safeProtocol(state.config?.brand?.protocol);
    if (!protocol) {
      showToast('The Orvexa link handler is not configured correctly.');
      return;
    }

    closeModal('reviewModal');
    showToast('Opening Orvexa for confirmation…');
    const uri = `${protocol}://install?ids=${encodeURIComponent(ids.join(','))}`;
    window.location.assign(uri);

    setTimeout(() => {
      if (!document.hidden) openDownloadModal();
    }, 1400);
  }

  async function configureDownload() {
    const configured = state.config?.download?.windowsUrl;
    const url = safeDownloadPath(configured) || 'downloads/Orvexa-Setup-x64.exe';
    refs.downloadWindows.href = url;

    try {
      const response = await fetch(url, { method: 'HEAD', cache: 'no-store', credentials: 'same-origin' });
      if (response.status === 404 || response.status === 410) disableDownload();
    } catch {
      // Some static hosts do not permit HEAD. Keep the same-origin download link available.
    }
  }

  function disableDownload() {
    refs.downloadWindows.removeAttribute('href');
    refs.downloadWindows.setAttribute('aria-disabled', 'true');
    refs.downloadWindows.classList.add('disabled-link');
    refs.downloadStatus.textContent =
      'Orvexa Setup is not published on this web deployment yet. The Windows source package still contains the production Setup definition.';
  }

  function openDownloadModal() {
    closeMobileNav();
    showDialog(refs.download);
  }

  function showDialog(dialog) {
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function closeModal(id) {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
  }

  function findEnabledApp(id) {
    return state.catalog.apps.find(app => app.id === id && app.enabled);
  }

  function safeAssetPath(value) {
    const path = typeof value === 'string' ? value.trim() : '';
    if (!path.startsWith('assets/') || path.includes('..') || /[:\\]/.test(path)) {
      return 'assets/brand/mark.svg';
    }
    return escapeHtml(path);
  }

  function safeDownloadPath(value) {
    const path = typeof value === 'string' ? value.trim() : '';
    if (!path.startsWith('downloads/') || path.includes('..') || /[:\\]/.test(path)) return null;
    return path;
  }

  function safeMicrosoftUrl(value) {
    try {
      const url = new URL(String(value || ''));
      const host = url.hostname.toLowerCase();
      if (url.protocol !== 'https:') return null;
      if (host !== 'microsoft.com' && !host.endsWith('.microsoft.com')) return null;
      return url.href;
    } catch {
      return null;
    }
  }

  function safeProtocol(value) {
    const protocol = typeof value === 'string' ? value.toLowerCase().trim() : '';
    return /^[a-z][a-z0-9+.-]{1,31}$/.test(protocol) ? protocol : null;
  }

  function showCatalogFailure() {
    refs.empty.hidden = false;
    refs.apps.hidden = true;
    refs.loadMoreWrap.hidden = true;
    refs.resultsCount.textContent = 'Catalog unavailable';
    const title = refs.empty.querySelector('strong');
    const copy = refs.empty.querySelector('p');
    if (title) title.textContent = 'Catalog unavailable';
    if (copy) copy.textContent = 'Reload the page and try again.';
    showToast('Orvexa catalog could not be loaded.');
  }

  function showToast(message) {
    refs.toast.textContent = message;
    refs.toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => refs.toast.classList.remove('show'), 2600);
  }

  function capitalize(value) {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    })[character]);
  }

  boot();
})();
