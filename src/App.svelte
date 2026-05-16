<script>
  import { loadData, saveData } from './lib/storage.js';
  import Dashboard from './pages/Dashboard.svelte';
  import Budget from './pages/Budget.svelte';
  import Income from './pages/Income.svelte';
  import Credit from './pages/Credit.svelte';
  import Savings from './pages/Savings.svelte';
  import Investments from './pages/Investments.svelte';
  import Vehicles from './pages/Vehicles.svelte';
  import ExpenseCuts from './pages/ExpenseCuts.svelte';
  import Pets from './pages/Pets.svelte';
  import DataEntry from './pages/DataEntry.svelte';

  let currentPage = $state('dashboard');
  let sidebarOpen = $state(false);
  let data = $state(loadData());

  const pages = [
    { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
    { id: 'budget', label: 'Budget', icon: '☰' },
    { id: 'income', label: 'Income', icon: '↗' },
    { id: 'credit', label: 'Credit Health', icon: '◉' },
    { id: 'savings', label: 'Emergency Fund', icon: '⬡' },
    { id: 'investments', label: 'Investments', icon: '△' },
    { id: 'vehicles', label: 'Vehicles', icon: '⬢' },
    { id: 'expenses', label: 'Expense Cuts', icon: '✂' },
    { id: 'pets', label: 'Pet Finance', icon: '♥' },
    { id: 'data-entry', label: 'Data Entry', icon: '⎙' },
  ];

  function navigate(id) {
    currentPage = id;
    sidebarOpen = false;
  }

  function handleSave(newData) {
    data = newData;
    saveData(data);
  }

  function getTitle(id) {
    return pages.find(p => p.id === id)?.label || 'Dashboard';
  }

  const now = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
</script>

<div class="app-layout">
  <nav class="sidebar" class:open={sidebarOpen}>
    <div class="sidebar-header">
      <div class="logo">
        <span class="logo-icon">◈</span>
        <span class="logo-text">FinPulse</span>
      </div>
      <button class="sidebar-close" onclick={() => sidebarOpen = false}>✕</button>
    </div>
    <ul class="nav-list">
      {#each pages as page}
        <li>
          <button class="nav-link" class:active={currentPage === page.id} onclick={() => navigate(page.id)}>
            <span class="nav-icon">{page.icon}</span>
            <span class="nav-label">{page.label}</span>
          </button>
        </li>
      {/each}
    </ul>
    <div class="sidebar-footer">
      <div class="disclaimer-badge">Educational Only</div>
    </div>
  </nav>

  <main class="main-content">
    <header class="top-bar">
      <div class="top-bar-left">
        <button class="mobile-menu-btn" onclick={() => sidebarOpen = !sidebarOpen}>☰</button>
        <h1 class="page-title">{getTitle(currentPage)}</h1>
      </div>
      <span class="current-date">{now}</span>
    </header>

    <div class="page-container fade-in" style="--fade-key:{currentPage}">
      {#if currentPage === 'dashboard'}
        <Dashboard {data} onsave={handleSave} />
      {:else if currentPage === 'budget'}
        <Budget {data} onsave={handleSave} />
      {:else if currentPage === 'income'}
        <Income {data} onsave={handleSave} />
      {:else if currentPage === 'credit'}
        <Credit {data} onsave={handleSave} />
      {:else if currentPage === 'savings'}
        <Savings {data} onsave={handleSave} />
      {:else if currentPage === 'investments'}
        <Investments {data} onsave={handleSave} />
      {:else if currentPage === 'vehicles'}
        <Vehicles {data} onsave={handleSave} />
      {:else if currentPage === 'expenses'}
        <ExpenseCuts {data} onsave={handleSave} />
      {:else if currentPage === 'pets'}
        <Pets {data} onsave={handleSave} />
      {:else if currentPage === 'data-entry'}
        <DataEntry {data} onsave={handleSave} />
      {/if}
    </div>

    <footer class="app-footer">
      <p>Educational information only — not investment, tax, or legal advice. Verify with a licensed professional before acting.</p>
    </footer>
  </main>
</div>

{#if sidebarOpen}
  <div class="overlay" onclick={() => sidebarOpen = false} role="presentation"></div>
{/if}

<style>
  .app-layout { display: flex; min-height: 100vh; }

  .sidebar { width: var(--sidebar-w); background: var(--bg-secondary); border-right: 1px solid var(--border); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; bottom: 0; z-index: 100; transition: transform var(--transition); }
  .sidebar-header { display: flex; align-items: center; justify-content: space-between; padding: 1.2rem 1rem; border-bottom: 1px solid var(--border); }
  .logo { display: flex; align-items: center; gap: 0.6rem; }
  .logo-icon { font-size: 1.5rem; color: var(--accent-light); filter: drop-shadow(0 0 8px rgba(99,102,241,0.4)); }
  .logo-text { font-weight: 700; font-size: 1.1rem; background: linear-gradient(135deg, var(--accent-light), var(--teal)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .sidebar-close { font-size: 1.2rem; color: var(--text-secondary); display: none; }
  .nav-list { list-style: none; flex: 1; padding: 0.5rem 0; overflow-y: auto; }
  .nav-link { display: flex; align-items: center; gap: 0.75rem; padding: 0.7rem 1.2rem; margin: 2px 0.5rem; border-radius: var(--radius-sm); color: var(--text-secondary); font-size: 0.88rem; font-weight: 500; transition: all var(--transition); position: relative; width: calc(100% - 1rem); text-align: left; }
  .nav-link:hover { color: var(--text-primary); background: var(--bg-card); }
  .nav-link.active { color: var(--accent-light); background: var(--accent-glow); }
  .nav-link.active::before { content: ''; position: absolute; left: 0; top: 25%; bottom: 25%; width: 3px; background: var(--accent); border-radius: 3px; }
  .nav-icon { font-size: 1.1rem; width: 1.4rem; text-align: center; flex-shrink: 0; }
  .sidebar-footer { padding: 1rem; border-top: 1px solid var(--border); }
  .disclaimer-badge { font-size: 0.7rem; color: var(--amber); background: var(--amber-glow); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); text-align: center; font-weight: 600; }

  .main-content { margin-left: var(--sidebar-w); flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
  .top-bar { display: flex; align-items: center; justify-content: space-between; padding: 1rem 2rem; border-bottom: 1px solid var(--border); background: var(--bg-secondary); position: sticky; top: 0; z-index: 50; }
  .top-bar-left { display: flex; align-items: center; gap: 1rem; }
  .mobile-menu-btn { display: none; font-size: 1.3rem; color: var(--text-secondary); }
  .page-title { font-size: 1.3rem; font-weight: 700; }
  .current-date { font-size: 0.85rem; color: var(--text-muted); }
  .page-container { flex: 1; padding: 1.5rem 2rem; }
  .app-footer { padding: 1rem 2rem; border-top: 1px solid var(--border); text-align: center; font-size: 0.72rem; color: var(--text-muted); font-style: italic; }

  .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 90; }

  @media (max-width: 768px) {
    .sidebar { transform: translateX(-100%); }
    .sidebar.open { transform: translateX(0); }
    .sidebar-close { display: block; }
    .main-content { margin-left: 0; }
    .mobile-menu-btn { display: block; }
    .page-container { padding: 1rem; }
    .top-bar { padding: 0.8rem 1rem; }
  }
</style>
