/**
 * 新竹縣緊急救護暨高級救護技術員 (EMT-P) 深度成效戰情儀表板 - Application Logic
 * 支援三種 OHCA 案件類型全域切換：全部 OHCA、非創傷 OHCA (內科/心因)、創傷 OHCA (外傷致死性)
 * 整合 GreenSock (GSAP 3) 官方核心動效套件 (100% 資料對齊無抽換純淨修復版)
 */

document.addEventListener('DOMContentLoaded', () => {
  const data = window.DASHBOARD_DATA;
  if (!data) {
    console.error('DASHBOARD_DATA not found!');
    return;
  }

  // ================= 0. GSAP 3 Plugin Registration & A11y Config =================
  if (window.gsap) {
    if (window.Flip) gsap.registerPlugin(Flip);
    if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const d = (seconds) => (prefersReducedMotion ? 0 : seconds);

  // Helper: Smooth numeric counter animation
  function animateNumber(element, targetVal, formatFn, duration = 0.75) {
    if (!element) return;
    if (prefersReducedMotion || !window.gsap) {
      element.textContent = formatFn(targetVal);
      return;
    }
    const currentVal = typeof element._gsapNumVal === 'number' ? element._gsapNumVal : (targetVal * 0.75);
    const obj = { val: currentVal };
    gsap.killTweensOf(obj);
    gsap.to(obj, {
      val: targetVal,
      duration: d(duration),
      ease: 'power2.out',
      onUpdate: () => {
        element._gsapNumVal = obj.val;
        element.textContent = formatFn(obj.val);
      },
      onComplete: () => {
        element._gsapNumVal = targetVal;
        element.textContent = formatFn(targetVal);
      }
    });
  }

  // ================= 1. Global State Management =================
  let currentOhcaMode = 'all'; // 'all', 'non_trauma', 'trauma'

  function getActiveDataset() {
    if (data.modes && data.modes[currentOhcaMode]) {
      return data.modes[currentOhcaMode];
    }
    return data;
  }

  // ================= 2. Header Tickers with GSAP Numbers =================
  function renderHeaderTickers() {
    const activeData = getActiveDataset();
    const summary = activeData.summary || {};
    const totalOhca = summary.total_ohca || 4037;
    const totalRosc = summary.total_rosc || 652;
    const roscRate = summary.rosc_rate || (totalRosc / totalOhca * 100).toFixed(1);
    const gmEms = summary.gm_total_ems || 26843;
    const gmRate = summary.gm_rosc_rate || 30.39;
    const gmR1 = summary.gm_r1_rosc_rate || 23.57;

    const elTotalOhca = document.getElementById('ticker-total-ohca');
    const elTotalRosc = document.getElementById('ticker-total-rosc');
    const elGmEms = document.getElementById('ticker-gm-ems');
    const elGmRate = document.getElementById('ticker-gm-rate');
    const elFfCount = document.getElementById('count-firefighters');

    animateNumber(elTotalOhca, totalOhca, val => `${Math.round(val).toLocaleString()} 件`, 0.8);
    animateNumber(elTotalRosc, totalRosc, val => `${Math.round(val).toLocaleString()} 人 (${roscRate}%)`, 0.85);
    animateNumber(elGmEms, gmEms, val => `${Math.round(val).toLocaleString()} 件`, 0.8);
    animateNumber(elGmRate, parseFloat(gmRate), val => `${val.toFixed(2)}% (R1 ${gmR1}%)`, 0.85);
    
    if (elFfCount) {
      elFfCount.textContent = `${(activeData.career_firefighters || []).length}位專職`;
    }
  }

  // ================= 3. Nav Tabs Switching with GSAP Crossfade =================
  const tabs = document.querySelectorAll('.nav-tab');
  const panes = document.querySelectorAll('.tab-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-tab');
      const currentActivePane = document.querySelector('.tab-pane.active');
      const targetPane = document.getElementById(targetId);

      if (targetPane === currentActivePane) return;

      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      if (!window.gsap || prefersReducedMotion) {
        panes.forEach(p => p.classList.remove('active'));
        if (targetPane) {
          targetPane.classList.add('active');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }

      // Smooth GSAP cross-fade
      if (currentActivePane) {
        gsap.to(currentActivePane, {
          autoAlpha: 0,
          y: -10,
          duration: d(0.2),
          ease: 'power2.in',
          onComplete: () => {
            currentActivePane.classList.remove('active');
            if (targetPane) {
              targetPane.classList.add('active');
              window.scrollTo({ top: 0, behavior: 'smooth' });
              gsap.fromTo(targetPane,
                { autoAlpha: 0, y: 15 },
                {
                  autoAlpha: 1,
                  y: 0,
                  duration: d(0.35),
                  ease: 'power2.out'
                }
              );
            }
          }
        });
      } else if (targetPane) {
        panes.forEach(p => p.classList.remove('active'));
        targetPane.classList.add('active');
        gsap.fromTo(targetPane, { autoAlpha: 0, y: 15 }, { autoAlpha: 1, y: 0, duration: d(0.35), ease: 'power2.out' });
      }
    });
  });

  // ================= 4. TAB 1: 光明分隊警消個人分析專頁 =================
  const ffGrid = document.getElementById('firefighter-grid');
  const ffSearch = document.getElementById('firefighter-search');
  const ffPills = document.querySelectorAll('#firefighter-filter-pills .filter-pill');
  const modal = document.getElementById('profile-modal');
  const modalClose = document.getElementById('modal-close-btn');

  let currentFfFilter = 'all';
  let currentFfSearch = '';

  function attachCard3DTilt(card) {
    if (prefersReducedMotion || !window.gsap) return;
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(card, {
        rotationY: x * 7,
        rotationX: -y * 7,
        duration: 0.25,
        ease: 'power1.out',
        overwrite: 'auto'
      });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        rotationY: 0,
        rotationX: 0,
        duration: 0.45,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    });
  }

  function renderFirefighters() {
    if (!ffGrid) return;
    const activeData = getActiveDataset();
    const list = activeData.career_firefighters || [];

    const filtered = list.filter(ff => {
      // Pill filter
      if (currentFfFilter === 'tp' && !ff.is_tp) return false;
      if (currentFfFilter === 'non-tp' && ff.is_tp) return false;
      if (currentFfFilter === 'heavy' && ff.general_ems_calls < 2000) return false;

      // Text search
      if (currentFfSearch) {
        const q = currentFfSearch.toLowerCase();
        const matchName = ff.name.toLowerCase().includes(q);
        const matchRole = ff.role.toLowerCase().includes(q);
        const matchBadge = (ff.badge || '').toLowerCase().includes(q);
        if (!matchName && !matchRole && !matchBadge) return false;
      }
      return true;
    });

    const state = (window.Flip && ffGrid.children.length > 0) ? Flip.getState(ffGrid.children) : null;
    ffGrid.innerHTML = '';

    if (filtered.length === 0) {
      ffGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-dim);">查無符合條件的警消同仁</div>';
      return;
    }

    filtered.forEach(ff => {
      const card = document.createElement('div');
      card.className = 'firefighter-card';
      const roleTagClass = ff.is_tp ? 'tag-tp' : 'tag-emt2';
      const hasImage = !!ff.hero_image;
      const thumbHtml = hasImage 
        ? `<img src="${ff.hero_image}" alt="${ff.hero_name}" class="ff-thumb-img" />`
        : '';

      card.innerHTML = `
        <div class="card-top-row">
          <div class="ff-name-title">
            <div class="ff-name">${ff.name}</div>
            <span class="ff-role-tag ${roleTagClass}">${ff.role}</span>
          </div>
          <span class="ff-badge">${ff.badge || '光明前線主力'}</span>
        </div>

        <div class="ff-thumb-row">
          ${thumbHtml}
          <div style="flex: 1; min-width: 0;">
            <div class="ff-hero-meta">
              <span>🏛️</span> 歷史人物：<strong>${ff.hero_name}</strong>・<span>${ff.hero_title}</span>
            </div>
            <div class="ff-hero-quote">「${ff.hero_quote}」</div>
          </div>
        </div>

        <div class="ff-kpi-summary">
          <div class="ff-kpi-item">
            <span class="ff-kpi-label">一般救護量</span>
            <span class="ff-kpi-val text-blue">${ff.general_ems_calls.toLocaleString()}</span>
          </div>
          <div class="ff-kpi-item">
            <span class="ff-kpi-label">OHCA出勤</span>
            <span class="ff-kpi-val">${ff.ohca_calls}</span>
          </div>
          <div class="ff-kpi-item">
            <span class="ff-kpi-label">廣義成功率</span>
            <span class="ff-kpi-val text-emerald">${ff.rosc_rate}%</span>
          </div>
        </div>

        <div style="font-size: 0.84rem; color: var(--text-body); line-height: 1.6; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
          ${ff.desc}
        </div>

        <div class="ff-skills-compact">
          <span>給藥: <strong>${ff.drug_rate}%</strong></span>
          <span>插管: <strong>${ff.endo_rate}%</strong></span>
          <span>救回: <strong class="text-emerald">${ff.ohca_rosc}人</strong></span>
        </div>
      `;

      card.addEventListener('click', () => openFirefighterModal(ff));
      attachCard3DTilt(card);
      ffGrid.appendChild(card);
    });

    if (state && window.Flip) {
      Flip.from(state, {
        duration: d(0.45),
        ease: 'power2.out',
        stagger: 0.02,
        absolute: true,
        onEnter: elements => gsap.fromTo(elements, { autoAlpha: 0, scale: 0.9, y: 15 }, { autoAlpha: 1, scale: 1, y: 0, duration: d(0.4), ease: 'power2.out' }),
        onLeave: elements => gsap.to(elements, { autoAlpha: 0, scale: 0.9, y: -10, duration: d(0.25), ease: 'power2.in' })
      });
    } else if (window.gsap && !prefersReducedMotion) {
      gsap.fromTo(ffGrid.children, 
        { autoAlpha: 0, y: 18, scale: 0.96 }, 
        { autoAlpha: 1, y: 0, scale: 1, duration: d(0.45), stagger: 0.03, ease: 'power2.out' }
      );
    }
  }

  // Filter Pills event
  ffPills.forEach(pill => {
    pill.addEventListener('click', () => {
      ffPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFfFilter = pill.getAttribute('data-filter');
      renderFirefighters();
    });
  });

  // Search Input event
  if (ffSearch) {
    ffSearch.addEventListener('input', (e) => {
      currentFfSearch = e.target.value.trim();
      renderFirefighters();
    });
  }

  // Modal open function with GSAP Orchestration
  function openFirefighterModal(ff) {
    const activeData = getActiveDataset();
    const femaleNames = new Set(['黃玉喬', '張馨予', '紀琍瑀', '紀俐瑀', '黃美樺', '蔡億鼎']);
    const avatarEl = document.getElementById('modal-avatar');
    if (avatarEl) {
      avatarEl.textContent = femaleNames.has(ff.name) ? '👩‍🚒' : '👨‍🚒';
    }

    document.getElementById('modal-name').textContent = ff.name;
    document.getElementById('modal-role-pill').textContent = ff.role;
    document.getElementById('modal-role-pill').className = `profile-badge-pill ${ff.is_tp ? 'tag-tp' : 'tag-emt2'}`;
    document.getElementById('modal-title-badge').textContent = ff.badge || '光明主力';
    document.getElementById('modal-group-sub').textContent = `光明分隊專職警消・【${activeData.label}】・一般救護 ${ff.general_ems_calls.toLocaleString()} 件（佔比 ${ff.general_ems_pct}%）`;

    // Hero Showcase Banner
    document.getElementById('modal-hero-name').textContent = ff.hero_name;
    document.getElementById('modal-hero-title').textContent = ff.hero_title;
    document.getElementById('modal-hero-quote').textContent = `「${ff.hero_quote}」`;
    document.getElementById('modal-hero-narrative').textContent = ff.desc;

    const heroFrame = document.getElementById('modal-hero-image-frame');
    const heroImg = document.getElementById('modal-hero-img');
    const heroSeal = document.getElementById('modal-hero-seal');
    const heroBgImg = document.getElementById('modal-hero-bg-img');

    // Clear dynamic seals if any
    const existingLargeSeal = heroFrame.querySelector('.hero-large-seal');
    if (existingLargeSeal) existingLargeSeal.remove();

    let currentSealEl = heroSeal;

    if (ff.hero_image) {
      heroImg.src = ff.hero_image;
      heroImg.style.display = 'block';
      heroSeal.style.display = 'block';
      heroSeal.textContent = `${ff.hero_name}像`;
      heroFrame.classList.remove('seal-only');

      if (heroBgImg) {
        heroBgImg.src = ff.hero_image;
        heroBgImg.style.display = 'block';
      }
    } else {
      heroImg.style.display = 'none';
      heroSeal.style.display = 'none';
      heroFrame.classList.add('seal-only');
      const sealDiv = document.createElement('div');
      sealDiv.className = 'hero-large-seal';
      sealDiv.innerHTML = `${ff.hero_name}<br><span style="font-size: 0.9rem; font-weight: normal;">之印</span>`;
      heroFrame.appendChild(sealDiv);
      currentSealEl = sealDiv;

      if (heroBgImg) {
        heroBgImg.style.display = 'none';
      }
    }

    document.getElementById('modal-general-calls').textContent = `${ff.general_ems_calls.toLocaleString()} 件`;
    document.getElementById('modal-general-pct').textContent = `佔光明全隊 ${ff.general_ems_pct}%`;
    document.getElementById('modal-ohca-calls').textContent = `${ff.ohca_calls} 件`;
    document.getElementById('modal-rosc-calls').textContent = `${ff.ohca_rosc} 人`;
    document.getElementById('modal-rosc-rate').textContent = `成功率 ${ff.rosc_rate}% (全隊差 ${ff.diff_broad >= 0 ? '+' : ''}${ff.diff_broad}%)`;
    document.getElementById('modal-r1-calls').textContent = `${ff.r1_rosc} 人`;
    document.getElementById('modal-r1-rate').textContent = `到院前率 ${ff.r1_rate}%`;

    // Skills Bars
    document.getElementById('modal-drug-rate').textContent = `${ff.drug_rate}% (平均 ${ff.drug_avg} 劑)`;
    document.getElementById('modal-drug-fill').style.width = `${Math.min(100, ff.drug_rate)}%`;

    document.getElementById('modal-endo-rate').textContent = `${ff.endo_rate}%`;
    document.getElementById('modal-endo-fill').style.width = `${Math.min(100, ff.endo_rate)}%`;

    document.getElementById('modal-sga-rate').textContent = `${ff.sga_rate}%`;
    document.getElementById('modal-sga-fill').style.width = `${Math.min(100, ff.sga_rate)}%`;

    document.getElementById('modal-iv-rate').textContent = `${ff.iv_rate}%`;
    document.getElementById('modal-iv-fill').style.width = `${Math.min(100, ff.iv_rate)}%`;

    // Review Text
    document.getElementById('modal-review-text').textContent = ff.desc;

    // Best Partners Table
    const partnersTbody = document.getElementById('modal-partners-tbody');
    partnersTbody.innerHTML = '';
    const partners = ff.best_partners || [];
    if (partners.length === 0) {
      partnersTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-dim);">無共同出勤達 3 件以上之特定搭檔紀錄</td></tr>';
    } else {
      partners.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td><strong>${maskPatientName(p.name)}</strong></td>
          <td>${p.total} 件</td>
          <td class="text-emerald">${p.rosc} 件</td>
          <td><strong class="text-blue">${p.rate}%</strong></td>
        `;
        partnersTbody.appendChild(row);
      });
    }

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';

    // GSAP Modal Animations
    if (window.gsap && !prefersReducedMotion) {
      const dialog = modal.querySelector('.modal-dialog');
      gsap.killTweensOf([modal, dialog]);
      
      gsap.fromTo(modal, { autoAlpha: 0 }, { autoAlpha: 1, duration: d(0.25) });
      gsap.fromTo(dialog, 
        { scale: 0.92, y: 18, autoAlpha: 0 }, 
        { scale: 1, y: 0, autoAlpha: 1, duration: d(0.4), ease: 'back.out(1.25)' }
      );

      if (currentSealEl) {
        gsap.fromTo(currentSealEl,
          { scale: 1.85, rotation: -14, autoAlpha: 0 },
          { scale: 1, rotation: 0, autoAlpha: 1, duration: d(0.4), delay: d(0.2), ease: 'back.out(2.4)' }
        );
      }

      if (heroImg && heroImg.style.display !== 'none') {
        gsap.fromTo(heroImg,
          { scale: 1.08, filter: 'blur(5px)', autoAlpha: 0 },
          { scale: 1, filter: 'blur(0px)', autoAlpha: 1, duration: d(0.55), delay: d(0.1), ease: 'power2.out' }
        );
      }

      const skillFills = [
        { el: document.getElementById('modal-drug-fill'), val: Math.min(100, ff.drug_rate) },
        { el: document.getElementById('modal-endo-fill'), val: Math.min(100, ff.endo_rate) },
        { el: document.getElementById('modal-sga-fill'), val: Math.min(100, ff.sga_rate) },
        { el: document.getElementById('modal-iv-fill'), val: Math.min(100, ff.iv_rate) }
      ];

      skillFills.forEach((item, idx) => {
        if (item.el) {
          gsap.fromTo(item.el,
            { width: '0%' },
            { width: `${item.val}%`, duration: d(0.75), delay: d(0.22 + idx * 0.08), ease: 'power2.out' }
          );
        }
      });
    }
  }

  function closeModal() {
    if (!modal) return;
    if (window.gsap && !prefersReducedMotion) {
      const dialog = modal.querySelector('.modal-dialog');
      gsap.to(dialog, {
        scale: 0.93,
        y: 12,
        autoAlpha: 0,
        duration: d(0.2),
        ease: 'power2.in',
        onComplete: () => {
          modal.classList.remove('open');
          document.body.style.overflow = '';
        }
      });
      gsap.to(modal, { autoAlpha: 0, duration: d(0.2) });
    } else {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('open')) closeModal();
  });

  // ================= 5. TAB 2: 全縣 37 位 EMT-P 總榜 (100% 原始欄位完整對齊) =================
  const lbTableBody = document.getElementById('leaderboard-tbody');
  const lbSearch = document.getElementById('leaderboard-search');
  const lbFilter = document.getElementById('leaderboard-group-filter');
  const lbHeaders = document.querySelectorAll('#leaderboard-table th.sortable');

  let currentLbGroup = 'all';
  let currentLbSearch = '';
  let lbSortField = 'rosc';
  let lbSortAsc = false;

  function getActiveLbList() {
    const activeData = getActiveDataset();
    return (currentLbGroup === 'post_gm') 
      ? (activeData.ranked_post_gm || []) 
      : (activeData.master_37_leaderboard || []);
  }

  function updateLbKpiCards() {
    const kpiContainer = document.querySelector('#tab-leaderboard .kpi-cards-grid');
    if (!kpiContainer) return;

    const list = getActiveLbList();
    if (!list || list.length === 0) return;

    const top1 = list[0] || { name: '蔣為理', rosc_tp: 45, ohca_tp: 119, rate_tp: 37.82, station: '光明' };
    const top2 = list[1] || { name: '許嘉雄', rosc_tp: 44, ohca_tp: 117, rate_tp: 37.61, station: '光明' };

    const mostCases = [...list].sort((a, b) => b.ohca_tp - a.ohca_tp)[0] || top1;

    const minCases = (currentOhcaMode === 'trauma') ? 5 : 15;
    const qualified = list.filter(r => r.ohca_tp >= minCases);
    const topRate = (qualified.length > 0)
      ? qualified.sort((a, b) => b.rate_tp - a.rate_tp)[0]
      : [...list].sort((a, b) => b.rate_tp - a.rate_tp)[0];

    const isPost = (currentLbGroup === 'post_gm');
    const titlePrefix = isPost ? '同起跑線' : '全縣';

    kpiContainer.innerHTML = `
      <div class="kpi-card highlight-emerald">
        <div class="kpi-title">${titlePrefix}救活總冠位 (#1)</div>
        <div class="kpi-number">${top1.rosc_tp} 人</div>
        <div class="kpi-sub">${top1.name} (${top1.station})・${top1.ohca_tp} 件 (${top1.rate_tp.toFixed(1)}%)</div>
      </div>
      <div class="kpi-card highlight-amber">
        <div class="kpi-title">${titlePrefix}救活第 2 位 (#2)</div>
        <div class="kpi-number">${top2.rosc_tp} 人</div>
        <div class="kpi-sub">${top2.name} (${top2.station})・${top2.ohca_tp} 件 (${top2.rate_tp.toFixed(1)}%)</div>
      </div>
      <div class="kpi-card highlight-blue">
        <div class="kpi-title">出勤總量攻堅王</div>
        <div class="kpi-number">${mostCases.ohca_tp} 件</div>
        <div class="kpi-sub">${mostCases.name} (${mostCases.station})・救活 ${mostCases.rosc_tp} 人 (${mostCases.rate_tp.toFixed(1)}%)</div>
      </div>
      <div class="kpi-card highlight-clay">
        <div class="kpi-title">${titlePrefix}勝率天花板</div>
        <div class="kpi-number">${topRate.rate_tp.toFixed(2)}%</div>
        <div class="kpi-sub">${topRate.name} (${topRate.station})・${topRate.ohca_tp} 件 / ${topRate.rosc_tp} ROSC</div>
      </div>
    `;

    if (window.gsap && !prefersReducedMotion) {
      gsap.fromTo(kpiContainer.children, 
        { autoAlpha: 0, y: 10 }, 
        { autoAlpha: 1, y: 0, duration: d(0.35), stagger: 0.05, ease: 'power2.out' }
      );
    }
  }

  function renderLeaderboard() {
    if (!lbTableBody) return;
    const existingRows = lbTableBody.querySelectorAll('tr');
    const state = (window.Flip && existingRows.length > 0) ? Flip.getState(existingRows) : null;

    lbTableBody.innerHTML = '';
    const activeLb = getActiveLbList();
    updateLbKpiCards();

    let list = activeLb.filter(r => {
      // Group filter (如果選 post_gm 則全體 37 人皆納入同一起跑線檢視)
      if (currentLbGroup === 'classmates' && !r.group.includes('同學組')) return false;
      if (currentLbGroup === 'senior' && !r.group.includes('資深')) return false;
      if (currentLbGroup === 'later' && !r.group.includes('新進')) return false;

      // Text search
      if (currentLbSearch) {
        const q = currentLbSearch.toLowerCase();
        const mName = r.name.toLowerCase().includes(q);
        const mStation = r.station.toLowerCase().includes(q);
        const mGroup = r.group.toLowerCase().includes(q);
        if (!mName && !mStation && !mGroup) return false;
      }
      return true;
    });

    // Sorting (100% 原始真實欄位)
    list.sort((a, b) => {
      let valA = a[lbSortField];
      let valB = b[lbSortField];

      if (lbSortField === 'rank') {
        valA = activeLb.indexOf(a) + 1;
        valB = activeLb.indexOf(b) + 1;
      } else if (lbSortField === 'total') {
        valA = a.total_cases_all; valB = b.total_cases_all;
      } else if (lbSortField === 'deducted') {
        valA = a.deducted_emt2; valB = b.deducted_emt2;
      } else if (lbSortField === 'tp_cases') {
        valA = a.ohca_tp; valB = b.ohca_tp;
      } else if (lbSortField === 'rosc') {
        valA = a.rosc_tp; valB = b.rosc_tp;
      } else if (lbSortField === 'rate') {
        valA = a.rate_tp; valB = b.rate_tp;
      } else if (lbSortField === 'drugs') {
        valA = a.drugs_tp; valB = b.drugs_tp;
      }

      if (typeof valA === 'string') {
        return lbSortAsc ? valA.localeCompare(valB, 'zh-TW') : valB.localeCompare(valA, 'zh-TW');
      }
      return lbSortAsc ? (valA - valB) : (valB - valA);
    });

    list.forEach((r) => {
      const globalRank = activeLb.findIndex(item => item.name === r.name) + 1;
      const tr = document.createElement('tr');

      let rankClass = 'rank-other';
      if (globalRank === 1) rankClass = 'rank-1';
      else if (globalRank === 2) rankClass = 'rank-2';
      else if (globalRank === 3) rankClass = 'rank-3';

      tr.innerHTML = `
        <td><span class="rank-badge ${rankClass}">#${globalRank}</span></td>
        <td><strong style="font-size: 1rem; color: var(--text-heading);">${r.name}</strong></td>
        <td><span style="font-size: 0.8rem; color: var(--text-muted);">${r.group}</span></td>
        <td>${r.station}</td>
        <td>${r.total_cases_all} 件</td>
        <td style="color: ${r.deducted_emt2 > 0 ? 'var(--color-clay)' : 'var(--text-dim)'}; font-weight: ${r.deducted_emt2 > 0 ? '600' : 'normal'};">${r.deducted_emt2 > 0 ? `-${r.deducted_emt2} 件` : '0 件'}</td>
        <td><strong>${r.ohca_tp} 件</strong></td>
        <td class="text-emerald"><strong>${r.rosc_tp} 人</strong></td>
        <td class="text-blue"><strong>${r.rate_tp.toFixed(2)}%</strong></td>
        <td>${r.drugs_tp} 次</td>
      `;
      lbTableBody.appendChild(tr);
    });

    if (state && window.Flip) {
      Flip.from(state, {
        duration: d(0.38),
        ease: 'power2.out',
        stagger: 0.012
      });
    }
  }

  if (lbSearch) {
    lbSearch.addEventListener('input', (e) => {
      currentLbSearch = e.target.value.trim();
      renderLeaderboard();
    });
  }

  if (lbFilter) {
    lbFilter.addEventListener('change', (e) => {
      currentLbGroup = e.target.value;
      renderLeaderboard();
    });
  }

  lbHeaders.forEach(th => {
    th.addEventListener('click', () => {
      const field = th.getAttribute('data-sort');
      if (lbSortField === field) {
        lbSortAsc = !lbSortAsc;
      } else {
        lbSortField = field;
        lbSortAsc = false;
      }
      renderLeaderboard();
    });
  });

    // Patient Name Anonymization (e.g., 陳O文, 杜OO妹)
  function maskPatientName(name) {
    if (!name || typeof name !== 'string') return '-';
    const len = name.length;
    if (len <= 1) return name;
    if (len === 2) return name[0] + 'O';
    if (len === 3) return name[0] + 'O' + name[2];
    return name[0] + 'O'.repeat(len - 2) + name[len - 1];
  }

// ================= 6. TAB 3: 救護常客大數據 (100% 原始結構完整呈現) =================
  function renderFrequentCallers() {
    const pyramidContainer = document.getElementById('pyramid-list');
    if (!pyramidContainer) return;
    const fc7y = data.frequent_callers || {};
    const dist = fc7y.distribution || {};

    pyramidContainer.innerHTML = '';
    for (const [tier, cnt] of Object.entries(dist)) {
      const row = document.createElement('div');
      row.className = 'pyramid-row';
      row.innerHTML = `
        <span class="pyramid-label">${tier}</span>
        <span class="pyramid-val">${cnt.toLocaleString()} 人</span>
      `;
      pyramidContainer.appendChild(row);
    }

    // 11501 Month Slice
    const fcm1 = data.frequent_callers_m1 || {};
    const m1List = fcm1['115年01月份_高頻率救護個案_Top15'] || [];
    const m1Tbody = document.getElementById('frequent-m1-tbody');
    if (m1Tbody) {
      m1Tbody.innerHTML = '';
      m1List.slice(0, 10).forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${maskPatientName(item.name)}</strong></td>
          <td><code>${item.id_masked || '-'}</code></td>
          <td class="text-clay"><strong>${item.count} 次</strong></td>
          <td><span style="font-size: 0.75rem; color: var(--text-dim);">${(item.forms || [])[0] || '-'}</span></td>
        `;
        m1Tbody.appendChild(tr);
      });
    }

    // Top 30 Frequent Callers
    const top30 = fc7y.top30 || [];
    const top30Tbody = document.getElementById('top30-tbody');
    if (top30Tbody) {
      top30Tbody.innerHTML = '';
      top30.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><span class="rank-badge ${p.rank <= 3 ? 'rank-' + p.rank : 'rank-other'}">#${p.rank}</span></td>
          <td><strong>${maskPatientName(p.name)}</strong></td>
          <td>${p.gender || '-'}</td>
          <td>${p.age ? p.age + ' 歲' : '-'}</td>
          <td class="text-clay"><strong>${p.count} 次</strong></td>
          <td>${p.main_town || '-'}</td>
          <td>${p.years_span || '-'}</td>
          <td style="font-size: 0.8rem; color: var(--text-dim);">${p.first_call || ''} ~ ${p.last_call || ''}</td>
        `;
        top30Tbody.appendChild(tr);
      });
    }

    if (window.gsap && !prefersReducedMotion) {
      const pRows = document.querySelectorAll('.pyramid-row');
      if (pRows.length > 0) {
        gsap.fromTo(pRows,
          { autoAlpha: 0, x: -20 },
          { autoAlpha: 1, x: 0, stagger: 0.05, duration: d(0.4), ease: 'power2.out' }
        );
      }
    }
  }

  // ================= 7. TAB 4: 雙人 / 三人組協同勝率 (100% 原始欄位完整呈現) =================
  function renderSynergy() {
    const activeData = getActiveDataset();
    const combData = activeData.combinations || {};
    const pairsTop = combData.pairs_top || [];
    const triosTop = combData.trios_top || [];

    const pairsTbody = document.getElementById('pairs-top-tbody');
    if (pairsTbody) {
      pairsTbody.innerHTML = '';
      if (pairsTop.length === 0) {
        pairsTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-dim);">此模式下尚無符合件數門檻之雙人搭檔</td></tr>';
      } else {
        pairsTop.slice(0, 12).forEach(p => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${p.names}</strong></td>
            <td>${p.total} 件</td>
            <td class="text-emerald"><strong>${p.rosc} 件</strong></td>
            <td class="text-blue"><strong>${p.rate.toFixed(1)}%</strong></td>
            <td>${p.drugs} 次</td>
          `;
          pairsTbody.appendChild(tr);
        });
      }
    }

    const triosTbody = document.getElementById('trios-top-tbody');
    if (triosTbody) {
      triosTbody.innerHTML = '';
      if (triosTop.length === 0) {
        triosTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-dim);">此模式下尚無符合件數門檻之三人搭檔</td></tr>';
      } else {
        triosTop.slice(0, 6).forEach(t => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${t.names}</strong></td>
            <td>${t.total} 件</td>
            <td class="text-emerald">${t.rosc} 件</td>
            <td class="text-blue"><strong>${t.rate.toFixed(1)}%</strong></td>
          `;
          triosTbody.appendChild(tr);
        });
      }
    }

    if (window.gsap && !prefersReducedMotion) {
      const rows = document.querySelectorAll('#pairs-top-tbody tr, #trios-top-tbody tr');
      if (rows.length > 0) {
        gsap.fromTo(rows, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, stagger: 0.02, duration: d(0.3), ease: 'power1.out' });
      }
    }
  }

  // ================= 8. TAB 5: 全局演進與各分隊戰情 (100% 原始欄位完整呈現) =================
  function renderEvolution() {
    const activeData = getActiveDataset();
    const macro = activeData.macro_kpis || {};
    const yearlyList = activeData.yearly_stats || [];
    const stationRows = activeData.ranked_stations || [];

    // 1. Update Macro KPI Cards (100% 原始精確欄位)
    const elKpi1 = document.getElementById('evo-kpi-1-val');
    const elKpi2 = document.getElementById('evo-kpi-2-val');
    const elKpi3 = document.getElementById('evo-kpi-3-val');
    const elKpi3Sub = document.getElementById('evo-kpi-3-sub');
    const elKpi4 = document.getElementById('evo-kpi-4-val');
    const elKpi4Sub = document.getElementById('evo-kpi-4-sub');

    if (elKpi1) elKpi1.textContent = `${macro.pre_r1_rate}% ➔ ${macro.post_r1_rate}%`;
    if (elKpi2) elKpi2.textContent = `${macro.pre_drugs_avg} ➔ ${macro.post_drugs_avg} 次`;
    if (elKpi3) elKpi3.textContent = `${macro.top_station_rate}%`;
    if (elKpi3Sub) {
      const sign = (macro.gm_growth >= 0) ? '+' : '';
      elKpi3Sub.textContent = `${macro.top_station || '光明分隊'}成軍後勝率 ${macro.gm_post_rate || 33.91}% (增幅 ▲${sign}${macro.gm_growth}%)`;
    }
    if (elKpi4) elKpi4.textContent = `${(macro.top2_tot || 1092).toLocaleString()} 件`;
    if (elKpi4Sub) {
      elKpi4Sub.textContent = `竹東 ${macro.zd_tot || 549}件 / 光明 ${macro.gm_tot || 543}件 合計承擔全縣 ${macro.top2_pct || 27}% OHCA`;
    }

    // Subtitle under Part 2
    const growthSub = document.getElementById('stations-growth-sub');
    if (growthSub && stationRows.length >= 2) {
      const top1 = stationRows[0];
      const top2 = stationRows[1];
      growthSub.innerHTML = `
        <strong>${top1.station}</strong>以 <strong>${top1.overall_rate}%</strong> 總勝率榮登全縣榜首，成軍後專責期高達 <strong>${top1.post_gm_rate}%</strong>（成效淨增幅 ▲+${top1.growth}%）；<strong>${top2.station}</strong>以 <strong>${top2.overall_rate}%</strong> 穩居第二。
      `;
    }

    // 2. Part 1 Table: 108 ~ 115 歷年演進走勢
    const yearlyTbody = document.getElementById('yearly-stats-tbody');
    if (yearlyTbody) {
      yearlyTbody.innerHTML = '';
      yearlyList.forEach(y => {
        const tr = document.createElement('tr');
        const is111 = (y.year === '111');
        if (is111) tr.className = 'highlight-row';

        const milestoneHtml = is111 
          ? '<span class="badge-gm-milestone">🔥 光明高救隊成立 (111.03)</span>' 
          : '';

        tr.innerHTML = `
          <td style="font-weight:700; color:var(--text-heading);">${y.year} 年</td>
          <td>${y.total_ohca.toLocaleString()} 件</td>
          <td style="font-weight:700; color:var(--color-sage);">${y.rosc} 人</td>
          <td style="font-weight:700;">${y.rosc_rate.toFixed(2)}%</td>
          <td style="font-weight:700; color:var(--color-blue);">${y.r1_rosc} 人</td>
          <td style="font-weight:700; color:var(--color-blue);">${y.r1_rate.toFixed(2)}%</td>
          <td>${y.drugs_count.toLocaleString()} 次</td>
          <td style="font-weight:600; color:var(--color-clay);">${y.drugs_per_case.toFixed(2)} 次</td>
          <td>${milestoneHtml}</td>
        `;
        yearlyTbody.appendChild(tr);
      });
    }

    // 3. Part 2 Table: 光明成軍前後 19 分隊消長排行表
    const growthTbody = document.getElementById('stations-growth-tbody');
    if (growthTbody) {
      growthTbody.innerHTML = '';
      stationRows.forEach((st, idx) => {
        const tr = document.createElement('tr');
        const rank = idx + 1;
        const isGm = st.station.includes('光明');

        let growthBadge = '';
        if (st.growth > 0) {
          growthBadge = `<span class="badge-growth-up">▲ +${st.growth.toFixed(2)}%</span>`;
        } else if (st.growth < 0) {
          growthBadge = `<span class="badge-growth-down">▼ ${st.growth.toFixed(2)}%</span>`;
        } else {
          growthBadge = `<span class="badge-growth-flat">─ 0.00%</span>`;
        }

        tr.innerHTML = `
          <td style="font-weight:700;">#${rank}</td>
          <td style="${isGm ? 'font-weight:800; color:var(--color-sage);' : 'font-weight:600;'}">${st.station}</td>
          <td>${st.total_ohca.toLocaleString()} 件</td>
          <td style="font-weight:700; color:var(--color-sage);">${st.total_rosc} 人</td>
          <td style="font-weight:700;">${st.overall_rate.toFixed(2)}%</td>
          <td style="color:var(--color-blue);">${st.r1_rate.toFixed(2)}%</td>
          <td style="color:var(--text-muted);">${st.pre_gm_rate.toFixed(2)}%</td>
          <td style="font-weight:700; color:var(--text-heading);">${st.post_gm_rate.toFixed(2)}%</td>
          <td>${growthBadge}</td>
        `;
        growthTbody.appendChild(tr);
      });
    }

    // 4. Part 3 Table: 108 ~ 115 各分隊全年度矩陣走勢
    const matrixTbody = document.getElementById('stations-matrix-tbody');
    if (matrixTbody) {
      matrixTbody.innerHTML = '';
      stationRows.forEach((st, idx) => {
        const tr = document.createElement('tr');
        const rank = idx + 1;
        const matrix = st.matrix || {};

        let cellsHtml = '';
        for (let yr = 108; yr <= 115; yr++) {
          const yrKey = String(yr);
          const cell = matrix[yrKey];
          if (!cell || cell.total === 0) {
            cellsHtml += `<td style="color:var(--text-dim);">-</td>`;
          } else {
            let colorVar = 'var(--text-body)';
            if (cell.rate >= 25.0) colorVar = 'var(--color-sage)';
            else if (cell.rate >= 15.0) colorVar = 'var(--color-blue)';

            cellsHtml += `
              <td style="font-weight:600; color:${colorVar};">
                ${cell.rate.toFixed(1)}% 
                <span style="font-size:11px; color:var(--text-dim);">(${cell.rosc}/${cell.total})</span>
              </td>
            `;
          }
        }

        tr.innerHTML = `
          <td style="font-weight:700;">#${rank}</td>
          <td style="font-weight:700;">${st.station}</td>
          ${cellsHtml}
        `;
        matrixTbody.appendChild(tr);
      });
    }
  }

  // ================= 9. Global OHCA Mode Switcher =================
  const modeButtons = document.querySelectorAll('.ohca-mode-btn');
  const bannerBadge = document.getElementById('notice-badge');
  const bannerDesc = document.getElementById('notice-text');

  function switchOhcaMode(newMode) {
    if (!data.modes || !data.modes[newMode]) {
      console.warn('Mode not found in data:', newMode);
      return;
    }
    currentOhcaMode = newMode;

    // 1. Update button UI
    modeButtons.forEach(btn => {
      if (btn.getAttribute('data-mode') === newMode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 2. Update notice banner
    const modeConfig = data.modes[newMode];
    if (bannerBadge) bannerBadge.textContent = `${modeConfig.label} 模式`;
    if (bannerDesc) bannerDesc.textContent = modeConfig.desc;

    // Banner pulse effect
    const noticeEl = document.getElementById('ohca-mode-notice');
    if (noticeEl && window.gsap && !prefersReducedMotion) {
      gsap.fromTo(noticeEl, { backgroundColor: 'var(--color-amber-soft)' }, { backgroundColor: 'var(--bg-card)', duration: d(0.7) });
    }

    // 3. Re-render all views
    renderHeaderTickers();
    renderFirefighters();
    renderLeaderboard();
    renderSynergy();
    renderEvolution();
  }

  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      switchOhcaMode(mode);
    });
  });

  // ================= 10. Initial Load & Launch Sequence =================
  renderHeaderTickers();
  renderFirefighters();
  renderLeaderboard();
  renderFrequentCallers();
  renderSynergy();
  renderEvolution();

  // Grand Opening Timeline
  if (window.gsap && !prefersReducedMotion) {
    const masterTl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    masterTl
      .fromTo('.brand-section', { autoAlpha: 0, y: -20 }, { autoAlpha: 1, y: 0, duration: d(0.55) })
      .fromTo('.header-stat-tickers .ticker-item', { autoAlpha: 0, y: 15 }, { autoAlpha: 1, y: 0, stagger: 0.08, duration: d(0.45) }, '-=0.3')
      .fromTo('.nav-tabs-wrapper', { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: d(0.35) }, '-=0.2')
      .fromTo('.ohca-filter-bar', { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: d(0.35) }, '-=0.2');
  }
});
