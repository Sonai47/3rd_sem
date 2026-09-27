(function () {
  'use strict';

  const state = {
    database: null,
    currentSubjectId: null,
    currentYear: null,
    practiceMode: true, 
    userMCQSelections: {}, 
    revealedAnswers: new Set(), 
    bookmarks: new Set(JSON.parse(localStorage.getItem('exam_bank_bookmarks') || '[]')),
    filters: {
      search: '',
      module: 'all',
      type: 'all',
      cognition: 'all'
    },
    globalSearchQuery: '',
    theme: 'light'
  };

  const elements = {
    appContent: document.getElementById('app-content'),
    navSubjectSelect: document.getElementById('nav-subject-select'),
    globalSearchBtn: document.getElementById('global-search-btn'),
    searchModal: document.getElementById('search-modal'),
    searchModalInput: document.getElementById('search-modal-input'),
    searchModalResults: document.getElementById('search-modal-results'),
    searchModalClose: document.getElementById('search-modal-close'),
    bookmarksBtn: document.getElementById('bookmarks-btn'),
    bookmarksBadge: document.getElementById('bookmarks-badge'),
    bookmarksModal: document.getElementById('bookmarks-modal'),
    bookmarksModalBody: document.getElementById('bookmarks-modal-body'),
    bookmarksModalClose: document.getElementById('bookmarks-modal-close'),
    cognitionGuideModal: document.getElementById('cognition-guide-modal'),
    cognitionGuideBtn: document.getElementById('cognition-guide-btn'),
    cognitionGuideClose: document.getElementById('cognition-guide-close'),
    themeToggleBtn: document.getElementById('theme-toggle-btn'),
    themeToggleLabel: document.getElementById('theme-toggle-label'),
    toastContainer: document.getElementById('toast-container'),
    brandHomeBtn: document.getElementById('brand-home-btn')
  };

  async function init() {
    initTheme();
    setupEventListeners();
    await loadDatabase();
    handleRouting();
    window.addEventListener('hashchange', handleRouting);
    updateBookmarkBadge();
  }

  async function loadDatabase() {
    showLoading();
    try {
      const response = await fetch('./exam_questions_database.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      state.database = await response.json();
      populateNavSubjects();
    } catch (err) {
      console.warn('Direct fetch failed. Checking fallback...', err);
      renderDatabaseLoadError(err);
    }
  }

  function populateNavSubjects() {
    if (!state.database || !state.database.subjects) return;
    elements.navSubjectSelect.innerHTML = '<option value="">-- Jump to Subject --</option>';
    state.database.subjects.forEach(subject => {
      const option = document.createElement('option');
      option.value = subject.id;
      option.textContent = `${subject.code} - ${subject.name.split('/')[0].trim()}`;
      elements.navSubjectSelect.appendChild(option);
    });
  }

  function handleRouting() {
    if (!state.database) return;

    const hash = window.location.hash.slice(1) || 'home';
    const parts = hash.split('/');

    if (parts[0] === 'home' || parts[0] === '') {
      state.currentSubjectId = null;
      state.currentYear = null;
      elements.navSubjectSelect.value = '';
      renderHomeView();
    } else if (parts[0] === 'subject' && parts[1]) {
      const subjectId = parts[1];
      const subject = state.database.subjects.find(s => s.id === subjectId || s.code === subjectId);
      if (subject) {
        state.currentSubjectId = subject.id;
        elements.navSubjectSelect.value = subject.id;
        
        const availableYears = (subject.papers || []).map(p => p.year);
        if (parts[2] && availableYears.includes(Number(parts[2]))) {
          state.currentYear = Number(parts[2]);
        } else if (availableYears.length > 0) {
          state.currentYear = availableYears[0];
        }
        
        state.filters.search = '';
        state.filters.module = 'all';
        state.filters.type = 'all';
        state.filters.cognition = 'all';

        renderSubjectView();
      } else {
        window.location.hash = '#home';
      }
    } else {
      renderHomeView();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function navigateTo(hash) {
    window.location.hash = hash;
  }

  function renderHomeView() {
    const university = state.database.university || 'B.Tech CSE (IoT) - 3rd Semester';
    const subjects = state.database.subjects || [];

    let totalQuestionsCount = 0;
    let totalPapersCount = 0;
    const allYears = new Set();

    subjects.forEach(sub => {
      (sub.papers || []).forEach(p => {
        totalPapersCount++;
        allYears.add(p.year);
        (p.groups || []).forEach(g => {
          totalQuestionsCount += (g.questions || []).length;
        });
      });
    });

    const yearsList = Array.from(allYears).sort((a, b) => b - a);

    let html = `
      <div class="hero-section">
        <div class="hero-header-tag">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          Academic Question Bank • Verified Curriculum
        </div>
        <h1 class="hero-title">${escapeHTML(university)}<br><span>Semester Exam Repository</span></h1>
        <p class="hero-desc">
          Browse comprehensive university exam question banks categorized by group, module, course outcomes (CO),
          and Bloom's cognition levels (LOCQ / IOCQ / HOCQ). Practice MCQs with instant feedback and export for revision.
        </p>

        <div class="hero-stats-grid">
          <div class="hero-stat-card">
            <div class="hero-stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            </div>
            <div>
              <div class="hero-stat-value">${subjects.length}</div>
              <div class="hero-stat-label">Core Subjects</div>
            </div>
          </div>

          <div class="hero-stat-card">
            <div class="hero-stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
            </div>
            <div>
              <div class="hero-stat-value">${totalQuestionsCount}</div>
              <div class="hero-stat-label">Exam Questions</div>
            </div>
          </div>

          <div class="hero-stat-card">
            <div class="hero-stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div>
              <div class="hero-stat-value">${yearsList.join(' & ')}</div>
              <div class="hero-stat-label">Years Available</div>
            </div>
          </div>

          <div class="hero-stat-card">
            <div class="hero-stat-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div>
              <div class="hero-stat-value">100%</div>
              <div class="hero-stat-label">CO & Bloom Mapped</div>
            </div>
          </div>
        </div>
      </div>

      <div class="section-header-block">
        <div>
          <h2 class="section-title">Select a Subject</h2>
          <p class="section-subtitle">Click on any subject card to view detailed question papers, modules, and Bloom's taxonomy distribution</p>
        </div>
        <div>
          <button class="btn-secondary" id="open-guide-hero-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Cognition Guide (LOCQ / IOCQ / HOCQ)
          </button>
        </div>
      </div>

      <div class="subjects-grid">
    `;

    subjects.forEach(subject => {
      let totalQ = 0;
      let locq = 0, iocq = 0, hocq = 0;
      const years = [];

      (subject.papers || []).forEach(p => {
        years.push(p.year);
        (p.groups || []).forEach(g => {
          (g.questions || []).forEach(q => {
            totalQ++;
            if (q.cognition === 'LOCQ') locq++;
            else if (q.cognition === 'IOCQ') iocq++;
            else if (q.cognition === 'HOCQ') hocq++;
          });
        });
      });

      const locqPct = totalQ > 0 ? Math.round((locq / totalQ) * 100) : 33;
      const iocqPct = totalQ > 0 ? Math.round((iocq / totalQ) * 100) : 34;
      const hocqPct = totalQ > 0 ? Math.round((hocq / totalQ) * 100) : 33;

      html += `
        <div class="subject-card" onclick="window.location.hash='#subject/${subject.id}'">
          <div class="subject-card-top">
            <span class="subject-code-tag">${escapeHTML(subject.code)}</span>
            <span class="subject-credits-badge">${subject.credits} Credits</span>
          </div>

          <h3 class="subject-name" title="${escapeHTML(subject.name)}">${escapeHTML(subject.name)}</h3>

          <div class="subject-meta-list">
            <div class="subject-meta-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span><strong>${totalQ}</strong> Questions</span>
            </div>
            <div class="subject-meta-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              <span><strong>${subject.modules ? subject.modules.length : 4}</strong> Modules</span>
            </div>
          </div>

          <div class="cognition-mini-bar-wrap">
            <div class="cognition-bar-label">
              <span>Cognition Mix</span>
              <span>${locqPct}% LOCQ • ${iocqPct}% IOCQ • ${hocqPct}% HOCQ</span>
            </div>
            <div class="cognition-bar-track" title="LOCQ: ${locqPct}%, IOCQ: ${iocqPct}%, HOCQ: ${hocqPct}%">
              <div class="cognition-bar-segment locq" style="width: ${locqPct}%"></div>
              <div class="cognition-bar-segment iocq" style="width: ${iocqPct}%"></div>
              <div class="cognition-bar-segment hocq" style="width: ${hocqPct}%"></div>
            </div>
          </div>

          <div class="subject-card-footer">
            <div class="years-pill-group">
              ${years.map(y => `<span class="year-tag">${y} Paper</span>`).join('')}
            </div>
            <span class="explore-btn">
              Explore Paper
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </span>
          </div>
        </div>
      `;
    });

    html += `</div>`;
    elements.appContent.innerHTML = html;

    const heroGuideBtn = document.getElementById('open-guide-hero-btn');
    if (heroGuideBtn) {
      heroGuideBtn.addEventListener('click', openCognitionGuide);
    }
  }

  function renderSubjectView() {
    const subject = state.database.subjects.find(s => s.id === state.currentSubjectId);
    if (!subject) {
      renderHomeView();
      return;
    }

    const availablePapers = subject.papers || [];
    let currentPaper = availablePapers.find(p => p.year === state.currentYear);
    if (!currentPaper && availablePapers.length > 0) {
      currentPaper = availablePapers[0];
      state.currentYear = currentPaper.year;
    }

    const allQuestions = [];
    const groupMap = {};

    if (currentPaper && currentPaper.groups) {
      currentPaper.groups.forEach(g => {
        groupMap[g.group] = g;
        (g.questions || []).forEach(q => {
          allQuestions.push({
            ...q,
            groupLetter: g.group,
            groupInstruction: g.instruction,
            paperYear: currentPaper.year
          });
        });
      });
    }

    const totalQCount = allQuestions.length;
    let mcqCount = 0;
    let descriptiveCount = 0;
    let numericalCount = 0;
    let locqCount = 0;
    let iocqCount = 0;
    let hocqCount = 0;

    allQuestions.forEach(q => {
      const typeLower = (q.type || '').toLowerCase();
      if (typeLower === 'mcq' || typeLower === 'fill in the blank') {
        mcqCount++;
      } else if (typeLower === 'numerical') {
        numericalCount++;
      } else {
        descriptiveCount++;
      }

      if (q.cognition === 'LOCQ') locqCount++;
      else if (q.cognition === 'IOCQ') iocqCount++;
      else if (q.cognition === 'HOCQ') hocqCount++;
    });


    const locqPct = currentPaper?.cognition_distribution?.LOCQ ?? (totalQCount > 0 ? Math.round((locqCount / totalQCount) * 100) : 0);
    const iocqPct = currentPaper?.cognition_distribution?.IOCQ ?? (totalQCount > 0 ? Math.round((iocqCount / totalQCount) * 100) : 0);
    const hocqPct = currentPaper?.cognition_distribution?.HOCQ ?? (totalQCount > 0 ? Math.round((hocqCount / totalQCount) * 100) : 0);


    const filteredQuestions = allQuestions.filter(q => {
      if (state.filters.search.trim()) {
        const query = state.filters.search.toLowerCase().trim();
        const matchesQ = (q.question || '').toLowerCase().includes(query);
        const matchesQNo = (q.q_no || '').toLowerCase().includes(query);
        const matchesCO = (q.co || '').toLowerCase().includes(query);
        const matchesOptions = q.options ? Object.values(q.options).some(opt => (opt || '').toLowerCase().includes(query)) : false;
        if (!matchesQ && !matchesQNo && !matchesCO && !matchesOptions) return false;
      }
      if (state.filters.module !== 'all' && q.module !== state.filters.module) {
        return false;
      }
      if (state.filters.type !== 'all' && q.type !== state.filters.type) {
        return false;
      }
      if (state.filters.cognition !== 'all' && q.cognition !== state.filters.cognition) {
        return false;
      }
      return true;
    });

    const filteredByGroup = {};
    if (currentPaper && currentPaper.groups) {
      currentPaper.groups.forEach(g => {
        filteredByGroup[g.group] = [];
      });
    }
    filteredQuestions.forEach(q => {
      if (!filteredByGroup[q.groupLetter]) {
        filteredByGroup[q.groupLetter] = [];
      }
      filteredByGroup[q.groupLetter].push(q);
    });


    let html = `
      <div class="breadcrumb-bar">
        <a href="#home">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Home
        </a>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-current">${escapeHTML(subject.name.split('/')[0].trim())} (${escapeHTML(subject.code)})</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-current">${state.currentYear} Exam Paper</span>
      </div>

      <!-- Subject Header Banner -->
      <div class="subject-header-banner">
        <div class="subject-header-top">
          <div>
            <div class="subject-code-row">
              <span class="subject-code-tag">${escapeHTML(subject.code)}</span>
              <span class="subject-credits-badge">${subject.credits} Credits</span>
              <span class="paper-meta-badge">${currentPaper?.paper_code || subject.code}</span>
              <span class="paper-meta-badge">Full Marks: ${currentPaper?.total_marks || 60}</span>
              <span class="paper-meta-badge">Time: ${currentPaper?.time || '2.5 hrs'}</span>
            </div>
            <h1 class="subject-title-large">${escapeHTML(subject.name)}</h1>
          </div>

          <div class="subject-actions">
            <button class="btn-secondary" id="toggle-syllabus-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              <span id="syllabus-toggle-text">View Syllabus & COs</span>
            </button>
            <button class="btn-primary" onclick="window.print()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print Exam Paper
            </button>
          </div>
        </div>

        <!-- Collapsible Syllabus & Course Outcomes -->
        <div class="syllabus-accordion">
          <div class="syllabus-content" id="syllabus-content-area">
            <div class="modules-grid">
              ${(subject.modules || []).map(m => `
                <div class="module-box">
                  <div class="module-box-header">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    ${escapeHTML(m.name)}
                  </div>
                  <ul class="module-topics-list">
                    ${(m.topics || []).map(t => `<li>${escapeHTML(t)}</li>`).join('')}
                  </ul>
                </div>
              `).join('')}
            </div>

            <div class="co-section">
              <div class="co-section-title">Course Outcomes (CO Mapping)</div>
              <div class="co-list">
                ${(subject.course_outcomes || []).map(co => {
                  const parts = co.split(':');
                  const coCode = parts[0];
                  const coDesc = parts.slice(1).join(':').trim();
                  return `
                    <div class="co-item">
                      <span class="co-item-badge">${escapeHTML(coCode)}:</span>
                      <span>${escapeHTML(coDesc)}</span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Year Selector Switcher -->
      <div class="subject-view-controls">
        <div class="year-tabs-group">
          ${availablePapers.map(p => `
            <button class="year-tab-btn ${p.year === state.currentYear ? 'active' : ''}" 
                    onclick="window.location.hash='#subject/${subject.id}/${p.year}'">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${p.year} Exam Paper (${p.total_marks || 60} Marks)
            </button>
          `).join('')}
        </div>
        <div style="font-size: 0.85rem; color: var(--text-muted);">
          Showing <strong>${filteredQuestions.length}</strong> of <strong>${totalQCount}</strong> questions in ${state.currentYear}
        </div>
      </div>

      <!-- Subject Stats Bar -->
      <div class="subject-stats-bar">
        <div class="stats-metrics-row">
          <div class="stat-item">
            <span class="stat-item-number">${totalQCount}</span>
            <span class="stat-item-title">Total Questions</span>
          </div>
          <div class="stat-item">
            <span class="stat-item-number">${mcqCount}</span>
            <span class="stat-item-title">MCQs & Fill-ins</span>
          </div>
          <div class="stat-item">
            <span class="stat-item-number">${descriptiveCount}</span>
            <span class="stat-item-title">Descriptive / Theory</span>
          </div>
          <div class="stat-item">
            <span class="stat-item-number">${numericalCount}</span>
            <span class="stat-item-title">Numericals / Prototyping</span>
          </div>
        </div>

        <div class="stats-cognition-distribution">
          <div class="distribution-legend">
            <span class="legend-pill" title="Lower Order Cognitive Question: Recall & Understand">
              <span class="legend-dot locq"></span> LOCQ ${locqPct}%
            </span>
            <span class="legend-pill" title="Intermediate Order Cognitive Question: Apply & Analyze">
              <span class="legend-dot iocq"></span> IOCQ ${iocqPct}%
            </span>
            <span class="legend-pill" title="Higher Order Cognitive Question: Evaluate & Synthesize">
              <span class="legend-dot hocq"></span> HOCQ ${hocqPct}%
            </span>
          </div>
          <div class="distribution-progress-bar" title="Cognition Breakdown: ${locqPct}% LOCQ, ${iocqPct}% IOCQ, ${hocqPct}% HOCQ">
            <div class="progress-segment locq" style="width: ${locqPct}%"></div>
            <div class="progress-segment iocq" style="width: ${iocqPct}%"></div>
            <div class="progress-segment hocq" style="width: ${hocqPct}%"></div>
          </div>
        </div>
      </div>

      <!-- Filter & Search Toolbar (Sticky) -->
      <div class="filter-toolbar">
        <div class="filter-row-primary">
          <div class="filter-search-box">
            <svg class="filter-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" id="filter-search-input" placeholder="Search keywords in this paper..." value="${escapeHTML(state.filters.search)}">
          </div>

          <select class="filter-select" id="filter-module-select">
            <option value="all">All Modules (M1 - M4)</option>
            ${(subject.modules || []).map(m => `
              <option value="${m.id}" ${state.filters.module === m.id ? 'selected' : ''}>
                ${escapeHTML(m.name.split(':')[0])}: ${escapeHTML(m.name.split(':')[1] || m.name)}
              </option>
            `).join('')}
          </select>

          <select class="filter-select" id="filter-type-select">
            <option value="all">All Question Types</option>
            <option value="MCQ" ${state.filters.type === 'MCQ' ? 'selected' : ''}>MCQ</option>
            <option value="Fill in the blank" ${state.filters.type === 'Fill in the blank' ? 'selected' : ''}>Fill in the blank</option>
            <option value="Descriptive" ${state.filters.type === 'Descriptive' ? 'selected' : ''}>Descriptive</option>
            <option value="Numerical" ${state.filters.type === 'Numerical' ? 'selected' : ''}>Numerical</option>
            <option value="Proof" ${state.filters.type === 'Proof' ? 'selected' : ''}>Proof</option>
            <option value="Algorithmic" ${state.filters.type === 'Algorithmic' ? 'selected' : ''}>Algorithmic</option>
            <option value="Analytical" ${state.filters.type === 'Analytical' ? 'selected' : ''}>Analytical</option>
            <option value="Diagram" ${state.filters.type === 'Diagram' ? 'selected' : ''}>Diagram</option>
          </select>

          <select class="filter-select" id="filter-cognition-select">
            <option value="all">All Cognition Levels</option>
            <option value="LOCQ" ${state.filters.cognition === 'LOCQ' ? 'selected' : ''}>LOCQ (Lower Order)</option>
            <option value="IOCQ" ${state.filters.cognition === 'IOCQ' ? 'selected' : ''}>IOCQ (Intermediate)</option>
            <option value="HOCQ" ${state.filters.cognition === 'HOCQ' ? 'selected' : ''}>HOCQ (Higher Order)</option>
          </select>
        </div>

        <div class="filter-row-secondary">
          <div class="active-filters-badges">
            <span class="filter-counter-text">Showing ${filteredQuestions.length} of ${totalQCount} questions</span>
            ${(state.filters.search || state.filters.module !== 'all' || state.filters.type !== 'all' || state.filters.cognition !== 'all') ? `
              <span class="clear-filters-btn" id="reset-filters-btn">Reset All Filters</span>
            ` : ''}
          </div>

          <div class="practice-mode-toggle-wrap" title="Toggle between interactive self-test quiz mode and viewing answers directly">
            <span>Quiz / Self-Test Mode</span>
            <label class="switch">
              <input type="checkbox" id="practice-mode-checkbox" ${state.practiceMode ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- Quick Jump to Group Bar -->
      <div class="group-jump-nav">
        ${Object.keys(filteredByGroup).map(grp => {
          const count = filteredByGroup[grp].length;
          return `
            <a href="#group-section-${grp}" class="group-jump-link">
              <span>Group ${grp}</span>
              <span class="group-jump-count">${count}</span>
            </a>
          `;
        }).join('')}
      </div>

      <div class="question-groups-container">
    `;


    let totalShownInGroups = 0;

    if (currentPaper && currentPaper.groups) {
      currentPaper.groups.forEach(groupObj => {
        const groupLetter = groupObj.group;
        const qList = filteredByGroup[groupLetter] || [];
        totalShownInGroups += qList.length;

        if (qList.length === 0 && (state.filters.search || state.filters.module !== 'all' || state.filters.type !== 'all' || state.filters.cognition !== 'all')) {
          return;
        }

        html += `
          <section class="group-section" id="group-section-${groupLetter}">
            <div class="group-header-card">
              <div class="group-header-left">
                <div class="group-letter-badge">${groupLetter}</div>
                <div class="group-title-text">
                  <h3>Group ${groupLetter}</h3>
                  <div class="group-instruction-text">${escapeHTML(groupObj.instruction || 'Answer the questions')}</div>
                </div>
              </div>

              <div class="group-header-right">
                <span class="group-marks-pill">${qList.length} Questions</span>
                ${groupObj.total_marks ? `<span class="group-marks-pill">Total: ${groupObj.total_marks} Marks</span>` : ''}
                ${groupObj.marks_per_question ? `<span class="group-marks-pill">${groupObj.marks_per_question} Mark each</span>` : ''}
              </div>
            </div>

            <div class="questions-stack">
              ${qList.length > 0 ? qList.map(q => renderQuestionCard(q, subject)).join('') : `
                <div class="empty-state">
                  <div class="empty-state-icon">🔍</div>
                  <h4>No questions match your current filters in Group ${groupLetter}</h4>
                  <p>Try clearing your search keyword or relaxing module and cognition filters.</p>
                </div>
              `}
            </div>
          </section>
        `;
      });
    }

    if (totalShownInGroups === 0) {
      html += `
        <div class="empty-state">
          <div class="empty-state-icon">📚</div>
          <h4>No matching questions found</h4>
          <p>No questions matched your current filter criteria across any group.</p>
          <button class="btn-primary" id="empty-reset-filters-btn">Clear All Filters</button>
        </div>
      `;
    }

    html += `</div>`; 
    elements.appContent.innerHTML = html;

    setupSubjectViewInteractions();
  }
  function renderQuestionCard(q, subject) {
    const qKey = `${subject.id}-${state.currentYear}-${q.q_no}`;
    const isBookmarked = state.bookmarks.has(qKey);
    const typeClass = (q.type || 'descriptive').toLowerCase().replace(/\s+/g, '-');
    const cognitionClass = (q.cognition || 'IOCQ').toLowerCase();
    
    const moduleObj = subject.modules ? subject.modules.find(m => m.id === q.module) : null;
    const moduleName = moduleObj ? moduleObj.name : q.module;

    let contentHtml = '';

    if (q.type === 'MCQ' && q.options) {
      const userSelected = state.userMCQSelections[qKey];
      const isRevealed = state.revealedAnswers.has(qKey) || (!state.practiceMode);
      
      contentHtml += `<div class="mcq-options-grid">`;
      Object.entries(q.options).forEach(([optKey, optText]) => {
        let optionStateClass = '';
        if (isRevealed) {
          if (optKey.toLowerCase() === (q.correct_answer || '').toLowerCase()) {
            optionStateClass = 'revealed-correct';
          }
        }
        if (userSelected) {
          if (optKey === userSelected) {
            if (userSelected.toLowerCase() === (q.correct_answer || '').toLowerCase()) {
              optionStateClass = 'selected-correct';
            } else {
              optionStateClass = 'selected-wrong';
            }
          }
        }

        contentHtml += `
          <div class="mcq-option-item ${optionStateClass}" 
               data-qkey="${qKey}" 
               data-opt="${optKey}" 
               data-correct="${q.correct_answer}"
               onclick="window.examApp.handleMCQOptionClick('${qKey}', '${optKey}', '${q.correct_answer}')">
            <span class="option-prefix">${optKey.toUpperCase()}</span>
            <span class="option-text">${formatMathAndCode(optText)}</span>
          </div>
        `;
      });
      contentHtml += `</div>`;

      contentHtml += `
        <div class="mcq-answer-strip">
          <button class="reveal-answer-btn" onclick="window.examApp.toggleAnswerReveal('${qKey}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            ${isRevealed ? 'Hide Answer' : 'Reveal Answer Key'}
          </button>

          <div class="correct-answer-reveal ${isRevealed ? 'visible' : ''}">
            <span>Correct Option:</span>
            <strong>(${escapeHTML((q.correct_answer || '').toUpperCase())}) ${escapeHTML(q.options[q.correct_answer] || '')}</strong>
          </div>
        </div>
      `;
    } 
    else if (q.type === 'Fill in the blank' && q.answer) {
      const isRevealed = state.revealedAnswers.has(qKey) || (!state.practiceMode);
      contentHtml += `
        <div class="fill-blank-box">
          <div>
            <strong>Answer Key: </strong>
            <span class="blank-answer-text ${isRevealed ? 'visible' : ''}">${escapeHTML(q.answer)}</span>
          </div>
          <button class="reveal-answer-btn" onclick="window.examApp.toggleAnswerReveal('${qKey}')">
            ${isRevealed ? 'Hide' : 'Reveal Answer'}
          </button>
        </div>
      `;
    }

    return `
      <div class="question-card ${isBookmarked ? 'bookmarked' : ''}" id="question-card-${qKey}">
        <div class="question-meta-row">
          <div class="question-badges-group">
            <span class="q-number-badge">${escapeHTML(q.q_no)}</span>
            <span class="badge-type ${typeClass}">${escapeHTML(q.type || 'Question')}</span>
            <span class="badge-cognition ${cognitionClass}" title="Bloom's Level: ${getCognitionTooltip(q.cognition)}">
              ${escapeHTML(q.cognition || 'IOCQ')}
            </span>
            ${q.marks ? `<span class="badge-marks">${q.marks} Mark${q.marks > 1 ? 's' : ''}</span>` : ''}
            <span class="badge-module" title="${escapeHTML(moduleName)}">${escapeHTML(q.module || 'M1')}</span>
            ${q.co ? `<span class="badge-co" title="Course Outcome">${escapeHTML(q.co)}</span>` : ''}
          </div>

          <div class="question-card-actions">
            <button class="card-action-btn ${isBookmarked ? 'active-star' : ''}" 
                    title="${isBookmarked ? 'Remove Bookmark' : 'Bookmark Question'}" 
                    onclick="window.examApp.toggleBookmark('${qKey}', '${subject.id}', ${state.currentYear}, '${q.q_no}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </button>
            <button class="card-action-btn" title="Copy Question Text" onclick="window.examApp.copyQuestionText('${qKey}')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
          </div>
        </div>

        <div class="question-body-text" id="q-text-${qKey}">
          ${formatMathAndCode(q.question)}
        </div>

        ${contentHtml}

        <div class="question-footer-info">
          <div class="module-desc-tooltip" title="${escapeHTML(moduleName)}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            <span>${escapeHTML(moduleName)}</span>
          </div>
          <div>Group ${q.groupLetter} • ${state.currentYear}</div>
        </div>
      </div>
    `;
  }

  function setupSubjectViewInteractions() {
    const syllabusBtn = document.getElementById('toggle-syllabus-btn');
    const syllabusContent = document.getElementById('syllabus-content-area');
    const syllabusText = document.getElementById('syllabus-toggle-text');
    if (syllabusBtn && syllabusContent) {
      syllabusBtn.addEventListener('click', () => {
        const isActive = syllabusContent.classList.toggle('active');
        syllabusText.textContent = isActive ? 'Hide Syllabus & COs' : 'View Syllabus & COs';
      });
    }

    const filterInput = document.getElementById('filter-search-input');
    if (filterInput) {
      filterInput.addEventListener('input', (e) => {
        state.filters.search = e.target.value;
        renderSubjectView();
        const newInput = document.getElementById('filter-search-input');
        if (newInput) {
          newInput.focus();
          newInput.setSelectionRange(newInput.value.length, newInput.value.length);
        }
      });
    }

    const moduleSelect = document.getElementById('filter-module-select');
    if (moduleSelect) {
      moduleSelect.addEventListener('change', (e) => {
        state.filters.module = e.target.value;
        renderSubjectView();
      });
    }

    const typeSelect = document.getElementById('filter-type-select');
    if (typeSelect) {
      typeSelect.addEventListener('change', (e) => {
        state.filters.type = e.target.value;
        renderSubjectView();
      });
    }

    const cognitionSelect = document.getElementById('filter-cognition-select');
    if (cognitionSelect) {
      cognitionSelect.addEventListener('change', (e) => {
        state.filters.cognition = e.target.value;
        renderSubjectView();
      });
    }

    const practiceCheckbox = document.getElementById('practice-mode-checkbox');
    if (practiceCheckbox) {
      practiceCheckbox.addEventListener('change', (e) => {
        state.practiceMode = e.target.checked;
        if (!state.practiceMode) {
          showToast('Answer Key mode enabled (Answers revealed)');
        } else {
          showToast('Quiz mode enabled (Test yourself)');
        }
        renderSubjectView();
      });
    }

    const resetBtn = document.getElementById('reset-filters-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', resetSubjectFilters);
    }
    const emptyResetBtn = document.getElementById('empty-reset-filters-btn');
    if (emptyResetBtn) {
      emptyResetBtn.addEventListener('click', resetSubjectFilters);
    }
  }

  function resetSubjectFilters() {
    state.filters.search = '';
    state.filters.module = 'all';
    state.filters.type = 'all';
    state.filters.cognition = 'all';
    renderSubjectView();
    showToast('Filters cleared');
  }

  function handleMCQOptionClick(qKey, optKey, correctAns) {
    if (!state.practiceMode) return;
    state.userMCQSelections[qKey] = optKey;
    const isCorrect = optKey.toLowerCase() === (correctAns || '').toLowerCase();
    if (isCorrect) {
      showToast('🎉 Correct Answer! Great job.');
    } else {
      showToast('❌ Incorrect. Correct is: ' + correctAns.toUpperCase());
    }

    renderSubjectView();
  }

  function toggleAnswerReveal(qKey) {
    if (state.revealedAnswers.has(qKey)) {
      state.revealedAnswers.delete(qKey);
    } else {
      state.revealedAnswers.add(qKey);
    }
    renderSubjectView();
  }

  function toggleBookmark(qKey, subjectId, year, qNo) {
    if (state.bookmarks.has(qKey)) {
      state.bookmarks.delete(qKey);
      showToast('Removed from bookmarks');
    } else {
      state.bookmarks.add(qKey);
      showToast('⭐ Saved to bookmarks');
    }
    localStorage.setItem('exam_bank_bookmarks', JSON.stringify(Array.from(state.bookmarks)));
    updateBookmarkBadge();
    

    if (state.currentSubjectId) {
      renderSubjectView();
    }
  }

  function updateBookmarkBadge() {
    const count = state.bookmarks.size;
    elements.bookmarksBadge.textContent = count;
    elements.bookmarksBadge.style.display = count > 0 ? 'inline-block' : 'none';
  }

  function copyQuestionText(qKey) {
    const textEl = document.getElementById(`q-text-${qKey}`);
    if (textEl) {
      const plainText = textEl.innerText.trim();
      navigator.clipboard.writeText(plainText).then(() => {
        showToast('📋 Question text copied to clipboard!');
      }).catch(() => {
        showToast('Copied to clipboard');
      });
    }
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
      <span>${escapeHTML(message)}</span>
    `;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function openGlobalSearch() {
    elements.searchModal.classList.add('active');
    elements.searchModalInput.value = '';
    elements.searchModalInput.focus();
    renderSearchResults('');
  }

  function closeGlobalSearch() {
    elements.searchModal.classList.remove('active');
  }

  function renderSearchResults(query) {
    if (!state.database || !query.trim()) {
      elements.searchModalResults.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔎</div>
          <h4>Search Across All 5 Subjects</h4>
          <p>Type keywords, question topics, or terms like "Binary Tree", "AES", "Dijkstra", "Subnet", or "Big-Oh".</p>
        </div>
      `;
      return;
    }

    const qLower = query.toLowerCase().trim();
    const matches = [];

    (state.database.subjects || []).forEach(sub => {
      (sub.papers || []).forEach(p => {
        (p.groups || []).forEach(g => {
          (g.questions || []).forEach(q => {
            const inText = (q.question || '').toLowerCase().includes(qLower);
            const inType = (q.type || '').toLowerCase().includes(qLower);
            const inCO = (q.co || '').toLowerCase().includes(qLower);
            const inOpts = q.options ? Object.values(q.options).some(o => (o || '').toLowerCase().includes(qLower)) : false;

            if (inText || inType || inCO || inOpts) {
              matches.push({
                subject: sub,
                year: p.year,
                group: g.group,
                question: q
              });
            }
          });
        });
      });
    });

    if (matches.length === 0) {
      elements.searchModalResults.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🤔</div>
          <h4>No matching questions found</h4>
          <p>We couldn't find any questions matching "${escapeHTML(query)}". Try another search term.</p>
        </div>
      `;
      return;
    }

    let html = `<div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">Found <strong>${matches.length}</strong> matching questions:</div>`;

    matches.slice(0, 50).forEach(m => {
      const snippet = highlightSnippet(m.question.question, qLower);
      html += `
        <div class="search-result-item" onclick="window.examApp.jumpToQuestion('${m.subject.id}', ${m.year}, '${m.question.q_no}')">
          <div class="search-result-top">
            <span class="subject-code-tag">${escapeHTML(m.subject.code)}</span>
            <span class="year-tag">${m.year}</span>
            <span class="q-number-badge">${escapeHTML(m.question.q_no)}</span>
            <span class="badge-type ${(m.question.type || '').toLowerCase()}">${escapeHTML(m.question.type)}</span>
            <span class="badge-cognition ${(m.question.cognition || '').toLowerCase()}">${escapeHTML(m.question.cognition)}</span>
            <span style="margin-left: auto; color: var(--text-muted); font-size: 0.75rem;">Group ${m.group}</span>
          </div>
          <div class="search-result-text">${snippet}</div>
        </div>
      `;
    });

    elements.searchModalResults.innerHTML = html;
  }

  function highlightSnippet(text, query) {
    if (!text) return '';
    const safeText = escapeHTML(text);
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
    return safeText.replace(regex, '<mark>$1</mark>');
  }

  function jumpToQuestion(subjectId, year, qNo) {
    closeGlobalSearch();
    navigateTo(`#subject/${subjectId}/${year}`);
    setTimeout(() => {
      const qKey = `${subjectId}-${year}-${qNo}`;
      const targetCard = document.getElementById(`question-card-${qKey}`);
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetCard.style.outline = '3px solid #3b82f6';
        targetCard.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.4)';
        setTimeout(() => {
          targetCard.style.outline = '';
          targetCard.style.boxShadow = '';
        }, 3000);
      }
    }, 400);
  }

  function openBookmarksModal() {
    elements.bookmarksModal.classList.add('active');
    renderBookmarksList();
  }

  function closeBookmarksModal() {
    elements.bookmarksModal.classList.remove('active');
  }

  function renderBookmarksList() {
    if (state.bookmarks.size === 0) {
      elements.bookmarksModalBody.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⭐</div>
          <h4>No Bookmarked Questions Yet</h4>
          <p>Click the bookmark icon on any question to save it here for quick revision before your exam.</p>
        </div>
      `;
      return;
    }

    const bookmarkedList = [];
    state.bookmarks.forEach(bKey => {
      const parts = bKey.split('-');
      if (parts.length >= 3) {
        const subId = parts[0];
        const year = Number(parts[1]);
        const qNo = parts.slice(2).join('-');

        const sub = state.database?.subjects?.find(s => s.id === subId);
        if (sub) {
          const paper = sub.papers?.find(p => p.year === year);
          if (paper) {
            paper.groups?.forEach(g => {
              const q = g.questions?.find(item => item.q_no === qNo);
              if (q) {
                bookmarkedList.push({
                  bKey,
                  subject: sub,
                  year,
                  group: g.group,
                  question: q
                });
              }
            });
          }
        }
      }
    });

    let html = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <span style="font-size: 0.9rem; font-weight: 600; color: var(--navy-800);">Saved Questions (${bookmarkedList.length})</span>
        <button class="clear-filters-btn" onclick="window.examApp.clearAllBookmarks()">Clear All</button>
      </div>
    `;

    bookmarkedList.forEach(item => {
      html += `
        <div class="search-result-item" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;">
          <div style="flex: 1;" onclick="window.examApp.jumpToQuestion('${item.subject.id}', ${item.year}, '${item.question.q_no}'); window.examApp.closeBookmarksModal();">
            <div class="search-result-top">
              <span class="subject-code-tag">${escapeHTML(item.subject.code)}</span>
              <span class="year-tag">${item.year}</span>
              <span class="q-number-badge">${escapeHTML(item.question.q_no)}</span>
              <span class="badge-type ${(item.question.type || '').toLowerCase()}">${escapeHTML(item.question.type)}</span>
              <span class="badge-cognition ${(item.question.cognition || '').toLowerCase()}">${escapeHTML(item.question.cognition)}</span>
            </div>
            <div class="search-result-text">${escapeHTML(item.question.question)}</div>
          </div>
          <button class="card-action-btn active-star" title="Remove" onclick="window.examApp.toggleBookmark('${item.bKey}', '${item.subject.id}', ${item.year}, '${item.question.q_no}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>
      `;
    });

    elements.bookmarksModalBody.innerHTML = html;
  }

  function clearAllBookmarks() {
    if (confirm('Are you sure you want to clear all saved bookmarks?')) {
      state.bookmarks.clear();
      localStorage.removeItem('exam_bank_bookmarks');
      updateBookmarkBadge();
      renderBookmarksList();
      if (state.currentSubjectId) renderSubjectView();
      showToast('All bookmarks cleared');
    }
  }

  function openCognitionGuide() {
    elements.cognitionGuideModal.classList.add('active');
  }

  function closeCognitionGuide() {
    elements.cognitionGuideModal.classList.remove('active');
  }

  // ==========================================
  // Dark / Light Theme System
  // ==========================================
  function initTheme() {
    const savedTheme = localStorage.getItem('exam_bank_theme');
    let theme = savedTheme;
    if (!theme) {
      theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    applyTheme(theme, false);

    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('exam_bank_theme')) {
          applyTheme(e.matches ? 'dark' : 'light', false);
        }
      });
    }
  }

  function applyTheme(theme, notify = true) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('exam_bank_theme', theme);

    if (elements.themeToggleLabel) {
      elements.themeToggleLabel.textContent = theme === 'dark' ? 'Light' : 'Dark';
    }
    if (elements.themeToggleBtn) {
      const title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
      elements.themeToggleBtn.setAttribute('title', title);
      elements.themeToggleBtn.setAttribute('aria-label', title);
    }

    if (notify) {
      showToast(`${theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'} active`);
    }
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme, true);
  }

  function setupEventListeners() {
    if (elements.themeToggleBtn) {
      elements.themeToggleBtn.addEventListener('click', toggleTheme);
    }

    elements.navSubjectSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        navigateTo(`#subject/${e.target.value}`);
      }
    });

    elements.brandHomeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('#home');
    });

    elements.globalSearchBtn.addEventListener('click', openGlobalSearch);
    elements.searchModalClose.addEventListener('click', closeGlobalSearch);
    elements.searchModalInput.addEventListener('input', (e) => {
      renderSearchResults(e.target.value);
    });

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openGlobalSearch();
      } else if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'SELECT') {
        e.preventDefault();
        openGlobalSearch();
      } else if (e.key === 'Escape') {
        closeGlobalSearch();
        closeBookmarksModal();
        closeCognitionGuide();
      }
    });

    elements.bookmarksBtn.addEventListener('click', openBookmarksModal);
    elements.bookmarksModalClose.addEventListener('click', closeBookmarksModal);

    elements.cognitionGuideBtn.addEventListener('click', openCognitionGuide);
    elements.cognitionGuideClose.addEventListener('click', closeCognitionGuide);

    [elements.searchModal, elements.bookmarksModal, elements.cognitionGuideModal].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });
  }

  function showLoading() {
    elements.appContent.innerHTML = `
      <div style="text-align: center; padding: 5rem 1rem;">
        <div style="width: 48px; height: 48px; border: 4px solid #cbd5e1; border-top-color: #2563eb; border-radius: 50%; margin: 0 auto 1.5rem auto; animation: spin 0.8s linear infinite;"></div>
        <h3 style="font-size: 1.25rem; color: var(--navy-900);">Loading Exam Questions Database...</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.5rem;">Accessing syllabus data, course outcomes, and papers</p>
      </div>
      <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
    `;
  }

  function renderDatabaseLoadError(err) {
    elements.appContent.innerHTML = `
      <div class="empty-state" style="max-width: 650px; margin: 4rem auto; padding: 2.5rem; text-align: left;">
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
          <div style="font-size: 2rem;">📂</div>
          <div>
            <h3 style="color: #991b1b; font-size: 1.25rem; margin: 0;">Database File Access</h3>
            <p style="color: var(--text-muted); font-size: 0.85rem;">Local fetch encountered browser security restrictions or missing file</p>
          </div>
        </div>
        <p style="font-size: 0.9rem; line-height: 1.6; color: var(--navy-800); margin-bottom: 1.5rem;">
          If you opened this HTML file directly using <code>file:///</code> in your browser, modern browsers block <code>fetch()</code> by default due to CORS policies.
        </p>
        <div style="background: var(--bg-subtle); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border-light); margin-bottom: 1.5rem;">
          <strong style="font-size: 0.9rem; color: var(--navy-900);">Option 1: Quick Local Server (Recommended)</strong>
          <pre style="background: var(--navy-900); color: #93c5fd; padding: 0.75rem; border-radius: 6px; font-size: 0.85rem; margin-top: 0.5rem; overflow-x: auto;">npx serve .</pre>
        </div>
        <div style="background: #eff6ff; padding: 1.25rem; border-radius: 8px; border: 1px solid #bfdbfe;">
          <strong style="font-size: 0.9rem; color: #1e40af;">Option 2: Direct File Selector</strong>
          <p style="font-size: 0.85rem; color: #1e3a8a; margin: 0.35rem 0 0.75rem 0;">Select your <code>exam_questions_database.json</code> file directly to load it immediately in memory without needing a web server:</p>
          <input type="file" id="manual-json-file-input" accept=".json" style="font-size: 0.85rem;">
        </div>
      </div>
    `;

    const fileInput = document.getElementById('manual-json-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            try {
              state.database = JSON.parse(event.target.result);
              populateNavSubjects();
              handleRouting();
              showToast('Database loaded successfully from file!');
            } catch (parseErr) {
              alert('Invalid JSON file format: ' + parseErr.message);
            }
          };
          reader.readAsText(file);
        }
      });
    }
  }

  function getCognitionTooltip(cog) {
    if (cog === 'LOCQ') return 'Lower Order Cognitive Question: Focuses on knowledge recall and understanding.';
    if (cog === 'IOCQ') return 'Intermediate Order Cognitive Question: Focuses on application and analysis.';
    if (cog === 'HOCQ') return 'Higher Order Cognitive Question: Focuses on evaluation, synthesis, and problem solving.';
    return 'Cognition level mapped according to Bloom\'s Taxonomy';
  }

  function formatMathAndCode(text) {
    if (!text) return '';
    let escaped = escapeHTML(text);

    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
    escaped = escaped.replace(/\n/g, '<br>');
    escaped = escaped.replace(/(\w+)\^(\d+|\([^\)]+\)|\w+)/g, '$1<sup>$2</sup>');
    escaped = escaped.replace(/-&gt;/g, '→');

    return escaped;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  window.examApp = {
    handleMCQOptionClick,
    toggleAnswerReveal,
    toggleBookmark,
    copyQuestionText,
    jumpToQuestion,
    closeBookmarksModal,
    clearAllBookmarks,
    toggleTheme,
    applyTheme
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
