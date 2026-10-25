/* Public command snapshots: TTS 89c15fb and Helper 5f15888.
 * Keep names and subcommands aligned with tests/fixtures/command-registration.json. */
(function () {
  "use strict";

  const ttsCommands = [
    ["/invite","Get the link to add Vozen to another server.","start","Free",""],
    ["/vote","Get the link to vote for Vozen on top.gg.","help","Free",""],
    ["/help","Show Vozen's command list in Discord.","help","Free",""],
    ["/join","Join your current voice channel.","start","Free",""],
    ["/leave","Leave the voice channel.","start","Free",""],
    ["/tts <text>","Read a message out loud with your selected voice.","start","Free","Voice channel required"],
    ["/tts-file <text>","Create a private audio file from short text without joining a call.","start","Free","Max 500 characters"],
    ["/skip","Skip the audio currently playing.","start","Free",""],
    ["/queue","View or manage the privacy-safe playback queue.","start","Free","show · remove · clear · skip · pause · resume"],
    ["/shut-up","Stop Vozen speaking now and clear the whole queue.","start","Free",""],
    ["/laugh","Make Vozen laugh out loud in your current voice.","start","Free",""],
    ["/joke <language>","Tell a short joke in the language you choose.","fun","Free","Optional engine · optional laughter"],
    ["/rizz <language>","Drop a pickup line in the language you choose.","fun","Premium","Engine required · optional sound"],
    ["/sound <clip>","Play a sound clip in the voice channel.","start","Free",""],
    ["/8-ball <question>","Ask the magic 8-ball a yes/no question.","fun","Free","Language · engine"],
    ["/fortune","Read a fortune out loud.","fun","Free","Language · engine"],
    ["/cast","Randomly cast everyone in your voice call and reveal the result.","fun","Free","Voice channel required"],
    ["/fact","Tell a random fun fact.","fun","Free","Language · engine"],
    ["/wyr","Ask a would-you-rather question.","fun","Free","Language · engine"],
    ["/birthday","Set, show or clear your birthday greeting.","fun","Free","set · clear · show"],
    ["/privacy","Manage your personal data and opt-out preferences.","settings","Free","erase"],
    ["/translate","Configure opt-in text translation.","settings","Free","text · language · speak-language · status · enable · disable · clear · map-add · map-remove · map-list · preview · opt-out"],
    ["/top-speakers","See who Vozen has read the most, with daily streaks.","stats","Free",""],
    ["/server-stats","View server messages, top talkers and game stats.","stats","Free","Free preview","Optional Premium features; base access remains available without Premium."],
    ["/premium","Check Premium status or activate a server licence.","premium","Free","info · activate · deactivate"],
    ["/transcribe","Start or stop live voice transcription for consenting speakers.","premium","Premium","start · stop · revoke"],
    ["/voice","Manage your personal voice, language, engine and effects.","settings","Free","set · config · list · favorite · unfavorite · favorites · recent · browse · reset · detection · opt-out · opt-in · preview · nickname · effect","Optional Premium features; base access remains available without Premium."],
    ["/config","Manage server-wide Vozen settings.","settings","Admin","tts-channel · auto-read · max-chars · rate-limit · role · priority-role · blocked-role · enabled · x-said · auto-join · read-bots · voice-channel-reading · anti-spam · streaks · soundboard · vote-reminders · greet · greet-language · default-voice · language · show · reset · block-word add · block-word remove"],
    ["/setup","Configure the text channel, auto-read and voice permissions in one guided step.","start","Admin",""],
    ["/stats","Show Vozen bot statistics.","stats","Admin",""],
    ["/uptime","See how long Vozen has been online.","stats","Free",""],
    ["/bot-stats","Show public servers, voice sessions and uptime.","stats","Free",""],
    ["/game","Start a voice or text minigame with the server.","fun","Free","play · stop · list · leaderboard · stats","Optional Premium features; base access remains available without Premium."],
    ["/pronunciation","Teach Vozen how to say a word in your messages.","settings","Free","add · remove · list"],
    ["/server-pronunciation","Manage pronunciations for everyone in the server.","settings","Admin","add · remove · list","Optional Premium features; base access remains available without Premium."],
    ["/randomizer","Pick one option at random and say it out loud.","fun","Free","Options · language"],
    ["Speak","Read a selected message out loud.","help","Free","Message context menu"],
    ["Translate","Translate a selected message.","help","Free","Message context menu"],
    ["Transcribe voice message","Transcribe a selected voice message.","help","Premium","Message context menu"],
    ["/redeem <code>","Redeem a Vozen gift code.","premium","Free",""],
  ].map(([name, description, category, access, usage, premiumExtras]) => ({ product: "tts", name, description, category, access, usage, premiumExtras }));

  const helperCommands = [
    ["/ping","Check Helper latency","utilities","Free","","",""],
    ["/language","View or set the Helper language","utilities","Admin","","MANAGE_GUILD",""],
    ["/help","Show Helper modules","utilities","Free","","",""],
    ["/setup","Run the guided Helper setup for this server","utilities","Admin","","MANAGE_GUILD",""],
    ["/modules","Show enabled Helper modules","utilities","Free","","",""],
    ["/status","Show Helper setup and health status","utilities","Free","","",""],
    ["/dashboard","Open the Helper dashboard","utilities","Free","","",""],
    ["/plan","Show the active Vozen plan","utilities","Free","","",""],
    ["/privacy","Request your Helper data or erase voluntary data","utilities","Free","","",""],
    ["/permissions","Show the Helper Permission Passport","utilities","Free","","",""],
    ["/cases","List recent moderation cases","management","Admin","","MODERATE_MEMBERS",""],
    ["/modlogs","Show a member's moderation history","management","Admin","","MODERATE_MEMBERS",""],
    ["/warn","Create a moderation warning","management","Admin","","MODERATE_MEMBERS",""],
    ["/violation","Record a policy violation","management","Admin","","MODERATE_MEMBERS",""],
    ["/note","Add a moderation note","management","Admin","","MODERATE_MEMBERS",""],
    ["/reason","Update a case reason","management","Admin","","MODERATE_MEMBERS",""],
    ["/kick","Kick a member","management","Admin","","KICK_MEMBERS",""],
    ["/ban","Ban a member","management","Admin","","BAN_MEMBERS",""],
    ["/timeout","Timeout a member","management","Admin","","MODERATE_MEMBERS",""],
    ["/tempban","Temporarily ban a member; automatically unban after the duration","management","Admin","","BAN_MEMBERS",""],
    ["/softban","Ban and immediately unban a member to clear recent messages","management","Admin","","BAN_MEMBERS",""],
    ["/untimeout","Remove a member timeout","management","Admin","","MODERATE_MEMBERS",""],
    ["/unban","Unban a user","management","Admin","","BAN_MEMBERS",""],
    ["/purge","Delete recent messages","management","Admin","","MANAGE_MESSAGES",""],
    ["/afk","Set or clear your AFK status","community","Free","","",""],
    ["/remind","Create a durable reminder","utilities","Free","","",""],
    ["/tag","Show a saved tag","management","Free","","",""],
    ["/tags","List saved tags","management","Free","","",""],
    ["/birthday-set","Save your birthday day and month","community","Free","","",""],
    ["/birthday-remove","Remove your saved birthday","community","Free","","",""],
    ["/tag-set","Create or update a tag","management","Admin","","MANAGE_GUILD",""],
    ["/tag-delete","Delete a tag","management","Admin","","MANAGE_GUILD",""],
    ["/rank","Show a member's XP rank","community","Free","","","Premium unlocks custom rank-card styling; the default rank card is free."],
    ["/leaderboard","Show the XP leaderboard","community","Free","","",""],
    ["/leaderboard-privacy","Choose whether your XP appears on the leaderboard","community","Free","","",""],
    ["/achievements","Show your community achievements","community","Free","","",""],
    ["/serverstats","Show basic server statistics","insights","Free","","",""],
    ["/crypto","Show read-only CoinGecko prices","utilities","Free","","",""],
    ["/gas","Show a read-only gas price from an approved RPC","utilities","Free","","",""],
    ["/search","Search an approved knowledge provider","utilities","Free","","",""],
    ["/emojis","List this server's custom emojis","utilities","Free","","",""],
    ["/invites","Show current server invite usage","management","Admin","","MANAGE_GUILD",""],
    ["/balance","Show your community balance","community","Free","","",""],
    ["/daily","Claim your daily community reward","community","Free","","",""],
    ["/work","Claim a cooldown-based community work reward","community","Free","","",""],
    ["/economy-top","Show the richest community members","community","Free","","",""],
    ["/temp-channel","Create a temporary voice channel for yourself","utilities","Admin","","MANAGE_CHANNELS",""],
    ["/embed","Publish a safe embed in this channel (staff)","utilities","Admin","","MANAGE_MESSAGES",""],
    ["/starboard-set","Configure the starboard channel (staff)","community","Admin","","MANAGE_GUILD",""],
    ["/suggest","Submit a community suggestion","community","Free","","",""],
    ["/suggestion","Review a community suggestion (staff)","community","Admin","","MANAGE_MESSAGES",""],
    ["/giveaway-start","Start a durable giveaway (staff)","community","Admin","","MANAGE_GUILD",""],
    ["/gstart","Legacy alias for giveaway-start","community","Admin","","MANAGE_GUILD",""],
    ["/giveaway-end","End a giveaway now (staff)","community","Admin","","MANAGE_GUILD",""],
    ["/gend","Legacy alias for giveaway-end","community","Admin","","MANAGE_GUILD",""],
    ["/giveaway-list","List active giveaways","community","Free","","",""],
    ["/glist","Legacy alias for giveaway-list","community","Free","","",""],
    ["/greroll","Reroll a finished giveaway","community","Admin","","MANAGE_GUILD",""],
    ["/poll","Create a multi-choice poll","community","Free","","",""],
    ["/workflow-create","Create a bounded message automation (staff)","management","Admin","","MANAGE_GUILD","Free: 3 workflows per server. Premium: 25. Server-configured limits may be lower."],
    ["/workflow-list","List message automations","management","Free","","",""],
    ["/workflow-dry-run","Preview a workflow without executing it (staff)","management","Admin","","MANAGE_GUILD",""],
    ["/workflow-toggle","Enable or disable a workflow immediately (staff)","management","Admin","","MANAGE_GUILD",""],
    ["/workflow-delete","Delete a message automation (staff)","management","Admin","","MANAGE_GUILD",""],
    ["/ticket-panel","Create a support ticket panel","support","Admin","","MANAGE_CHANNELS","Free: 1 ticket panel per server. Premium: 10."],
    ["/ticket-config","Configure ticket routing, transcripts and SLA (staff)","support","Admin","","MANAGE_CHANNELS",""],
    ["/ticket-update","Update ticket category, priority or internal note","support","Admin","","MANAGE_CHANNELS",""],
    ["/ticket-rate","Rate a closed support ticket","support","Free","","",""],
    ["/rolepanel","Create a self-role panel","community","Admin","","MANAGE_ROLES","Free: 3 role panels per server. Premium: 25."],
    ["/slowmode","Set channel slowmode","management","Admin","","MANAGE_CHANNELS",""],
    ["/userinfo","Show basic user information","utilities","Free","","",""],
    ["/quarantine","Remove a member's roles and quarantine them","protection","Admin","","MODERATE_MEMBERS",""],
    ["/unquarantine","Restore a quarantined member's roles","protection","Admin","","MODERATE_MEMBERS",""],
    ["/join-gate","Configure the bounded new-member join gate","protection","Admin","","MANAGE_ROLES",""],
    ["/verify-panel","Post the verification panel using the configured join gate","protection","Admin","","MANAGE_GUILD",""],
    ["/lockdown","Lock text channels for @everyone","protection","Admin","","MANAGE_CHANNELS",""],
    ["/unlock","Remove the Helper lockdown from text channels","protection","Admin","","MANAGE_CHANNELS",""],
    ["/anti-raid","Configure the bounded join-burst anti-raid response","protection","Admin","","MANAGE_GUILD",""],
    ["/security-mode","Enable or disable shadow mode for high-risk security responses","protection","Admin","","MANAGE_GUILD",""],
    ["/anti-nuke","Configure the audit-log destructive-action guard","protection","Admin","","MANAGE_GUILD",""],
    ["/event-create","Create a native Discord scheduled event","community","Admin","","CREATE_EVENTS",""],
    ["/event-list","List native Discord scheduled events","community","Free","","",""],
    ["/event-edit","Edit a native Discord scheduled event","community","Admin","","CREATE_EVENTS",""],
    ["/event-register","Register yourself for a native Discord scheduled event","community","Free","","",""],
    ["/event-unregister","Remove yourself from a scheduled event","community","Free","","",""],
    ["/event-checkin","Check yourself in to a registered scheduled event","community","Free","","",""],
    ["/event-attendees","List registrations for a scheduled event","community","Admin","","CREATE_EVENTS",""],
    ["/event-cancel","Cancel a native Discord scheduled event","community","Admin","","CREATE_EVENTS",""],
  ].map(([name, description, category, access, usage, permission, premiumExtras]) => ({ product: "helper", name, description, category, access, usage, permission, premiumExtras }));

  const catalogue = {
    tts: {
      label: "Vozen TTS",
      search: "Try setup, voice or games",
      note: "Choose a category above or scan the complete TTS command set below.",
      contract: "Every command is registered from the Rust contract used by the live bot.",
      commands: ttsCommands,
      groups: [
        ["start", "Start & voice", "Get Vozen into a call and control the queue."],
        ["fun", "Fun & games", "Make the voice channel playful."],
        ["stats", "Stats & activity", "See what your server is saying."],
        ["settings", "Settings & privacy", "Shape Vozen around your server."],
        ["premium", "Premium", "Extra engines and server-wide upgrades."],
        ["help", "Help & community", "Find support and share Vozen."],
      ],
      steps: [["/setup", "Configure the server once"], ["/join", "Join your current voice channel"], ["/tts", "Say something out loud"]],
      action: "Add Vozen TTS to Discord",
      href: typeof window.vozenTtsInstallHref === "function"
        ? (window.vozenTtsInstallHref("commands") || "/dashboard.html?add=1")
        : "/dashboard.html?add=1",
      external: false,
    },
    helper: {
      label: "Vozen Helper",
      search: "Try protection, ticket or workflow",
      note: "Choose a category above or explore Helper's current command contract.",
      contract: "Helper commands are exported from the Rust contract used by the live Helper.",
      commands: helperCommands,
      groups: [
        ["protection", "Protection", "Review safety settings before they act in Discord."],
        ["community", "Community", "Run healthy community tools and events."],
        ["support", "Support", "Set up private, auditable support conversations."],
        ["management", "Management", "Moderate, audit and automate the server."],
        ["utilities", "Utilities", "Use small tools that keep work moving."],
        ["insights", "Insights", "See an at-a-glance server activity summary."],
      ],
      steps: [["/help", "See the server tools available to you"], ["/anti-raid", "Review your protection controls"], ["/ticket-panel", "Publish support when your server needs it"]],
      action: "Open Vozen Helper",
      href: "../helper/",
      external: false,
    },
  };

  const groupsEl = document.getElementById("commandGroups");
  const search = document.getElementById("commandSearch");
  const result = document.getElementById("commandResults");
  const filtersEl = document.getElementById("commandFilters");
  const productButtons = [...document.querySelectorAll("[data-command-product]")];
  const simple = Boolean(document.querySelector("[data-command-simple]"));
  if (simple) document.body.classList.add("commands-calm");
  const asideTitle = document.getElementById("commandAsideTitle");
  const asideSteps = document.getElementById("commandAsideSteps");
  const asideCta = document.getElementById("commandAsideCta");
  const asideNote = document.getElementById("commandAsideNote");
  let product = "tts";
  let activeFilter = "all";

  const locale = () => {
    try {
      const value = localStorage.getItem("vozen.lang") || "en";
      return window.VOZEN_I18N && window.VOZEN_I18N[value] ? value : "en";
    } catch (_) { return "en"; }
  };
  const interpolate = (value, variables) => String(value).replace(/\{(\w+)\}/g, (_, key) => String(variables?.[key] ?? `{${key}}`));
  const t = (key, fallback, variables) => {
    const dictionary = window.VOZEN_I18N || {};
    const value = dictionary[locale()]?.[key] || dictionary.en?.[key] || fallback || key;
    return interpolate(value, variables);
  };
  const groupKeys = {
    start: ["commands.groupStart", "Start & voice"],
    fun: ["commands.groupFun", "Fun & games"],
    stats: ["commands.groupStats", "Stats & activity"],
    settings: ["commands.groupSettings", "Settings & privacy"],
    premium: ["commands.groupPremium", "Premium"],
    help: ["commands.groupHelp", "Help & community"],
    protection: ["commands.groupProtection", "Protection"],
    community: ["commands.groupCommunity", "Community"],
    support: ["commands.groupSupport", "Support"],
    management: ["commands.groupManagement", "Management"],
    utilities: ["commands.groupUtilities", "Utilities"],
    insights: ["commands.groupInsights", "Insights"],
  };
  const genericCategory = (category) => t(`commands.generic.${category}`, "Use {command} to manage this feature.");
  const localizedAccess = (access) => {
    if (!access) return "";
    const keys = {
      Free: "commands.freeTag",
      Premium: "commands.premiumTag",
      Admin: "commands.adminTag",
      Moderator: "commands.moderatorTag",
      "Free + Premium": "commands.freePremiumTag",
      "Admin + Premium": "commands.adminPremiumTag",
    };
    return t(keys[access] || "commands.premiumTag", access);
  };
  const localizedCommand = (command) => {
    if (locale() === "en") return { ...command, access: localizedAccess(command.access) };
    return {
      ...command,
      description: genericCategory(command.category).replace("{command}", command.name),
      usage: command.usage ? t("commands.usageAvailable", "Options available in Discord.") : "",
      access: localizedAccess(command.access),
    };
  };
  const applyStaticCopy = () => {
    const copy = [
      [".commands-hero h1", "commands.heroTitle"],
      [".commands-hero__lead", "commands.heroLead"],
      [".command-finder__kicker", "commands.chooseBot"],
      [".command-finder__intro h2", "commands.exploreTitle"],
      [".command-finder__intro p:last-child", "commands.exploreSub"],
      [".command-product-picker", "commands.botAria", "aria-label"],
      ["[data-command-product=tts] small", "commands.voiceCommunity"],
      ["[data-command-product=helper] small", "commands.serverOperations"],
      [".command-search .sr-only", "commands.search"],
      ["#commandSearch", "commands.searchPlaceholder", "placeholder"],
      ["#commandFilters", "commands.filters", "aria-label"],
      [".commands-section__head .command-finder__kicker", "commands.fullCatalogue"],
      [".commands-aside__block--accent > .command-finder__kicker", "commands.newHere"],
      [".commands-aside__block:not(.commands-aside__block--accent) > .command-finder__kicker", "commands.readingLabels"],
      [".commands-legend li:nth-child(1) span:last-child", "commands.freeHelp"],
      [".commands-legend li:nth-child(2) span:last-child", "commands.premiumHelp"],
      [".commands-legend li:nth-child(3) span:last-child", "commands.adminHelp"],
    ];
    copy.forEach(([selector, key, attribute]) => {
      const element = document.querySelector(selector);
      if (!element) return;
      const value = t(key, element.textContent || element.getAttribute(attribute) || "");
      if (attribute) element.setAttribute(attribute, value);
      else element.textContent = value;
    });
    document.querySelectorAll(".commands-legend .command-tag").forEach((tag) => {
      const raw = tag.textContent.trim();
      tag.textContent = localizedAccess(raw);
    });
  };

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const tagClass = (tag) => tag.toLowerCase().includes("premium") ? "command-tag--premium" : /admin|moderator/i.test(tag) ? "command-tag--admin" : "command-tag--free";
  const current = () => catalogue[product];

  const categoryPaths = {
    invite: '<circle cx="9" cy="7" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3m3-15v6m-3-3h6"/>',
    leave: '<path d="m11 4-6 5H2v6h3l6 5V4Zm5 5 6 6m0-6-6 6"/>',
    skip: '<path d="m5 4 11 8L5 20V4Zm14 0v16"/>',
    queue: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    stop: '<rect x="5" y="5" width="14" height="14" rx="3"/>',
    laugh: '<circle cx="12" cy="12" r="9"/><path d="M7 13c1 6 9 6 10 0H7Zm1-5h.01m8 0h.01"/>',
    sound: '<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4V8Z"/>',
    join: '<path d="m11 4-6 5H2v6h3l6 5V4Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    all: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    start: '<path d="M4 10v4m4-8v12m4-15v18m4-15v12m4-8v4"/>',
    fun: '<path d="M7 6h10c3 0 4 3 5 10 0 3-3 4-5 1l-2-2H9l-2 2c-2 3-5 2-5-1 1-7 2-10 5-10Z"/><path d="M6 10v4m-2-2h4m8-1h.01m3 2h.01"/>',
    stats: '<path d="M4 20h16M7 16v-5m5 5V4m5 12V8"/>',
    settings: '<path d="M3 7h18M3 17h18"/><circle cx="8" cy="7" r="3" fill="#111b2f"/><circle cx="16" cy="17" r="3" fill="#111b2f"/>',
    premium: '<path d="m3 8 4-5h10l4 5-9 13L3 8Zm0 0h18M7 3l5 18 5-18"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3h.01"/>',
    protection: '<path d="m12 2 8 3v6c0 5-4 9-8 11-4-2-8-6-8-11V5Z"/><path d="m8 12 3 3 5-6"/>',
    community: '<circle cx="9" cy="7" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3m1-17a3 3 0 0 1 0 6m3 11v-3a7 7 0 0 0-3-6"/>',
    support: '<rect x="3" y="3" width="18" height="14" rx="4"/><path d="m7 17-1 5 7-5m-6-9h10m-10 4h6"/>',
    management: '<path d="M3 7h18M3 17h18"/><circle cx="8" cy="7" r="3" fill="#111b2f"/><circle cx="16" cy="17" r="3" fill="#111b2f"/>',
    utilities: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m7 9 3 3-3 3m6 0h4"/>',
    insights: '<path d="M4 20h16M7 16v-5m5 5V4m5 12V8"/>',
  };
  const categoryIcon = id => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${categoryPaths[id] || categoryPaths.all}</svg>`;
  function renderFilters() {
    const item = current();
    const entries = [["all",t("commands.all","All")],...item.groups.map(([id,title]) => [id,t(groupKeys[id]?.[0] || id,title)])];
    filtersEl.innerHTML = entries.map(([id,title]) => `<button class="${activeFilter===id ? "is-active" : ""}" type="button" data-filter="${id}" aria-pressed="${activeFilter===id}"><span>${escapeHtml(title)}</span></button>`).join("");
    filtersEl.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => {
      activeFilter = button.dataset.filter || "all";
      if (simple) search.value = "";
      filtersEl.querySelectorAll("[data-filter]").forEach((item) => {
        const selected = item === button;
        item.classList.toggle("is-active", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      render();
    }));
  }

  function renderAside() {
    const item = current();
    const isTts = product === "tts";
    asideTitle.textContent = isTts ? t("commands.threeStepsTts", "Three steps to voice") : t("commands.threeStepsHelper", "Three steps to Helper");
    const stepKeys = {
      "/setup": "commands.step.setup",
      "/join": "commands.step.join",
      "/tts": "commands.step.tts",
      "/help": "commands.step.help",
      "/anti-raid": "commands.step.antiRaid",
      "/ticket-panel": "commands.step.ticketPanel",
    };
    asideSteps.innerHTML = item.steps.map(([command, copy]) => `<li><code>${escapeHtml(command)}</code><span>${escapeHtml(t(stepKeys[command] || "", copy))}</span></li>`).join("");
    asideCta.textContent = isTts ? t("commands.addTts", item.action) : t("commands.addHelper", item.action);
    asideCta.href = item.href;
    asideCta.toggleAttribute("target", item.external);
    asideCta.toggleAttribute("rel", item.external);
    if (item.external) asideCta.setAttribute("rel", "noopener noreferrer");
    asideNote.textContent = isTts ? t("commands.contractTts", item.contract) : t("commands.contractHelper", item.contract);
  }

  function commandRow(command) {
    const localized = localizedCommand(command);
    const permission = command.permission?.toLowerCase().replaceAll("_", " ").replace("manage guild", "manage server");
    const accessTitle = command.product === "helper"
      ? (permission ? `Free plan. Requires ${permission} or Administrator.` : "Free plan. No command-specific staff permission required.")
      : localized.access;
    const baseTag = localized.access ? `<span class="command-tag ${tagClass(command.access)}" title="${escapeHtml(accessTitle)}" aria-label="${escapeHtml(localized.access + ": " + accessTitle)}">${escapeHtml(localized.access)}</span>` : "";
    const tags = command.premiumExtras
      ? `<span class="command-row__tags">${baseTag}<span class="command-tag command-tag--premium" title="${escapeHtml(command.premiumExtras)}" aria-label="${escapeHtml(command.premiumExtras)}">${escapeHtml(t("commands.premiumExtrasTag", "Premium extras"))}</span></span>`
      : baseTag;
    if (!simple) return `<article class="command-row"><div class="command-row__top"><code>${escapeHtml(localized.name)}</code>${tags}</div><p>${escapeHtml(localized.description)}</p>${localized.usage ? `<span class="command-row__usage">${escapeHtml(localized.usage)}</span>` : ""}</article>`;
    return `<article class="command-row" data-category="${escapeHtml(command.category)}">
      <div class="command-row__copy"><code>${escapeHtml(localized.name)}</code>
      <p>${escapeHtml(localized.description)}</p>
      ${localized.usage ? `<span class="command-row__usage">${escapeHtml(localized.usage)}</span>` : ""}</div>
      ${tags}
    </article>`;
  }

  function render() {
    const item = current();
    const query = (search?.value || "").trim().toLowerCase();
    const visible = item.commands.filter((command) => {
      const matchesFilter = activeFilter === "all" || command.category === activeFilter;
      const searchable = `${command.name} ${command.description} ${command.access} ${command.usage} ${command.premiumExtras || ""}`.toLowerCase();
      return matchesFilter && (!query || searchable.includes(query));
    });
    groupsEl.innerHTML = (simple && query) ? `<div class="command-list">${visible.map(commandRow).join("")}</div>` : item.groups.map(([id, title, note]) => {
      const items = visible.filter((command) => command.category === id);
      if (!items.length) return "";
      const groupTitle = t(groupKeys[id]?.[0] || id, title);
      const groupNote = t(`commands.group.${id}.note`, note);
      return `<section class="command-group" aria-labelledby="group-${id}">
        <div class="command-group__head"><div><div class="command-group__title">${simple ? categoryIcon(id) : ""}<h3 id="group-${id}">${groupTitle}</h3><span class="command-group__count">${items.length}</span></div><p>${groupNote}</p></div></div>
        <div class="command-list">${items.map(commandRow).join("")}</div>
      </section>`;
    }).join("");
    result.textContent = query || activeFilter !== "all"
      ? t(visible.length === 1 ? "commands.resultsMatchOne" : "commands.resultsMatchMany", "{n} commands match your search.", { n: visible.length })
      : t("commands.resultsAll", "Showing all {n} {product} commands.", { n: visible.length, product: item.label });
    if (simple && locale()==="en") result.textContent = `${visible.length} ${query ? (visible.length===1 ? "result" : "results") : "commands"}`;
    document.querySelectorAll(".command-empty").forEach((empty) => empty.remove());
    if (!visible.length) result.insertAdjacentHTML("afterend", `<p class="command-empty">${escapeHtml(simple && locale()==="en" ? "No commands found. Try another word." : t("commands.noMatch", "No commands match that search. Try a shorter word or choose a different category."))}</p>`);
  }

  function setProduct(nextProduct) {
    product = nextProduct;
    activeFilter = "all";
    search.value = "";
    const item = current();
    search.placeholder = simple && locale()==="en" ? "Search commands…" : t("commands.searchPlaceholder", item.search);
    document.getElementById("catalogueTitle").textContent = item.label;
    document.getElementById("catalogueNote").textContent = t("commands.catalogueNote", item.note);
    productButtons.forEach((button) => {
      const selected = button.dataset.commandProduct === product;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    renderFilters();
    renderAside();
    render();
  }

  productButtons.forEach((button) => {
    button.addEventListener("click", () => setProduct(button.dataset.commandProduct));
    button.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? productButtons[0] : event.key === "End" ? productButtons.at(-1) : productButtons.find(item => item !== button);
      setProduct(next.dataset.commandProduct);
      next.focus();
    });
  });
  search?.addEventListener("input", () => {
    if (simple && search.value.trim() && activeFilter!=="all") {
      activeFilter="all";
      renderFilters();
    }
    render();
  });
  window.addEventListener("vozen:languagechange", () => { applyStaticCopy(); setProduct(product); });
  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && document.activeElement !== search && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      search?.focus();
    }
  });

  applyStaticCopy();
  setProduct(product);
})();
