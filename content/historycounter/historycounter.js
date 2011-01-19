var HistoryCounterService = { 
	
/* Constants */ 
	
	BOX_CLASS_NAME   : 'historycounter-box', 
	LABEL_CLASS_NAME : 'historycounter-label',
 
	PREFROOT : 'extensions.historycounter@piro.sakura.ne.jp', 

	SHOW_BACK_KEY    : 'show.back',
	SHOW_FORWARD_KEY : 'show.forward',
	SHOW_TAB_KEY     : 'show.tab',
	ALIGN_KEY        : 'align',
	SIZE_KEY         : 'size',
 
	SHOW_ATTR_PREFIX : 'historycounter-show-in-', 
	ALIGN_ATTR       : 'historycounter-align',
  
/* Utilities */ 
	
	get browser() 
	{
		return gBrowser;
	},
 
	get backButton() 
	{
		return document.getElementById('back-button');
	},
 
	get backCount() 
	{
		var backButton = this.backButton;
		if (backButton) {
			var label = backButton.getElementsByAttribute('class', this.LABEL_CLASS_NAME);
			if (label.length) return label[0];
		}
		return null;
	},
 
	get forwardButton() 
	{
		return document.getElementById('forward-button');
	},
 
	get forwardCount() 
	{
		var forwardButton = this.forwardButton;
		if (forwardButton) {
			var label = forwardButton.getElementsByAttribute('class', this.LABEL_CLASS_NAME);
			if (label.length) return label[0];
		}
		return null;
	},
 
	getTabBrowserFromChild : function(aNode) 
	{
		if (!aNode) return null;
		var b = aNode.ownerDocument.evaluate(
				'ancestor-or-self::*[local-name()="tabbrowser"] | '+
				'ancestor-or-self::*[local-name()="tabs"][@tabbrowser]',
				aNode,
				null,
				XPathResult.FIRST_ORDERED_NODE_TYPE,
				null
			).singleNodeValue;
		return (b && b.tabbrowser) || b;
	},
 
	getTabs : function(aTabBrowser) 
	{
		return aTabBrowser.ownerDocument.evaluate(
				'descendant::*[local-name()="tab"]',
				aTabBrowser.mTabContainer,
				null,
				XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
				null
			);
	},
  
	initButtons : function() 
	{
		var countBox;

		var backButton = this.backButton;
		if (backButton && !this.backCount) {
			countBox = document.createElement('vbox');
			countBox.setAttribute('class', this.BOX_CLASS_NAME);

			countBox.appendChild(document.createElement('label'));
			countBox.lastChild.setAttribute('class', this.LABEL_CLASS_NAME);

			backButton.insertBefore(countBox, backButton.firstChild);
		}

		var forwardButton = this.forwardButton;
		if (forwardButton && !this.forwardCount) {
			countBox = document.createElement('vbox');
			countBox.setAttribute('class', this.BOX_CLASS_NAME);

			countBox.appendChild(document.createElement('label'));
			countBox.lastChild.setAttribute('class', this.LABEL_CLASS_NAME);

			forwardButton.insertBefore(countBox, forwardButton.firstChild);
		}

		this.updateCount();
	},
 
	updateCount : function() 
	{
		var history = this.browser.sessionHistory;
		if (!history) return;

		var count   = history.count;
		var current = history.index;

		var backCount = this.backCount;
		if (backCount && this.getPref(this.PREFROOT + '.' + this.SHOW_BACK_KEY)) {
			if (current > 0) {
				backCount.setAttribute('value', current);
				backCount.parentNode.hidden = false;
			}
			else {
				backCount.removeAttribute('value');
				backCount.parentNode.hidden = true;
			}
		}

		var forwardCount = this.forwardCount;
		if (forwardCount && this.getPref(this.PREFROOT + '.' + this.SHOW_FORWARD_KEY)) {
			var forwardNum = count - current - 1;
			if (forwardNum > 0) {
				forwardCount.setAttribute('value', forwardNum);
				forwardCount.parentNode.hidden = false;
			}
			else {
				forwardCount.removeAttribute('value');
				forwardCount.parentNode.hidden = true;
			}
		}
	},
 
	updateCountForTab : function(aTab) 
	{
		var counter = document.getAnonymousElementByAttribute(aTab, 'class', this.LABEL_CLASS_NAME);
		if (!counter) return;
		try {
			var history = aTab.linkedBrowser.sessionHistory;
			var count   = history.count;
			var current = history.index + 1;
			if (count < 2 && current < 2)
				counter.removeAttribute('value');
			else
				counter.setAttribute('value', current+'/'+history.count);
		}
		catch(e) {
		}
	},
 
/* Initializing */ 
	
	init : function() 
	{
		if (!this.browser) return;

		window.removeEventListener('load', this, false);
		window.addEventListener('TabOpen', this, false);
		window.addEventListener('TabClose', this, false);
		window.addEventListener('TabMove', this, false);

		this.addPrefListener(this);
		this.observe(null, 'nsPref:changed', this.PREFROOT + '.' + this.SHOW_BACK_KEY);
		this.observe(null, 'nsPref:changed', this.PREFROOT + '.' + this.SHOW_FORWARD_KEY);
		this.observe(null, 'nsPref:changed', this.PREFROOT + '.' + this.SHOW_TAB_KEY);
		this.observe(null, 'nsPref:changed', this.PREFROOT + '.' + this.ALIGN_KEY);
		this.observe(null, 'nsPref:changed', this.PREFROOT + '.' + this.SIZE_KEY);

		var toolbox = document.getElementById('navigator-toolbox');
		if (toolbox.customizeDone) {
			toolbox.__historycounter__customizeDone = toolbox.customizeDone;
			toolbox.customizeDone = function(aChanged) {
				this.__historycounter__customizeDone(aChanged);
				HistoryCounterService.initButtons();
			};
		}
		if ('BrowserToolboxCustomizeDone' in window) {
			var originalBrowserToolboxCustomizeDone = window.BrowserToolboxCustomizeDone;
			window.BrowserToolboxCustomizeDone = function(aChanged) {
				originalBrowserToolboxCustomizeDone.apply(window, arguments);
				HistoryCounterService.initButtons();
			};
		}

		this.initTabBrowser(this.browser);
		window.setTimeout(function(aSelf) { aSelf.initButtons(); }, 0, this);

		this.initialized = true;
	},
	
	initTabBrowser : function(aTabBrowser) 
	{
		aTabBrowser.addProgressListener(this, Components.interfaces.nsIWebProgress.NOTIFY_ALL);
		aTabBrowser.addTabsProgressListener(this, Components.interfaces.nsIWebProgress.NOTIFY_ALL);

		var tabs = this.getTabs(aTabBrowser);
		for (let i = 0, maxi = tabs.snapshotLength; i < maxi; i++)
		{
			this.initTab(tabs.snapshotItem(i), aTabBrowser);
		}
	},
 
	initTab : function(aTab, aTabBrowser) 
	{
		if (aTab.linkedBrowser.__historycounter__linkedTab) return;

		if (!aTabBrowser) aTabBrowser = this.getTabBrowserFromChild(aTab);
		var counter = document.getAnonymousElementByAttribute(aTab, 'class', this.BOX_CLASS_NAME);
		if (!counter) {
			counter = document.createElement('vbox');
			counter.setAttribute('class', this.BOX_CLASS_NAME);

			counter.appendChild(document.createElement('label'));
			counter.lastChild.setAttribute('class', this.LABEL_CLASS_NAME);

			var text = document.getAnonymousElementByAttribute(aTab, 'class', 'tab-text tab-label') ||
						document.getAnonymousElementByAttribute(aTab, 'class', 'tab-text');
			if (text) {
				text.parentNode.insertBefore(counter, text.nextSibling);
			}

			this.updateCountForTab(aTab);
		}

		aTab.linkedBrowser.__historycounter__linkedTab = aTab;
	},
  
	destroy : function() 
	{
		if (!this.browser) return;

		window.removeEventListener('unload', this, false);

		window.removeEventListener('TabOpen', this, false);
		window.removeEventListener('TabClose', this, false);
		window.removeEventListener('TabMove', this, false);

		this.removePrefListener(this);

		this.destroyTabBrowser(this.browser);
	},
	
	destroyTabBrowser : function(aTabBrowser) 
	{
		aTabBrowser.removeProgressListener(this);
		aTabBrowser.removeTabsProgressListener(this);

		var tabs = this.getTabs(aTabBrowser);
		for (var i = 0, maxi = tabs.snapshotLength; i < maxi; i++)
		{
			this.destroyTab(tabs.snapshotItem(i));
		}
	},
 
	destroyTab : function(aTab) 
	{
		try {
			delete aTab.linkedBrowser.__historycounter__linkedTab;
		}
		catch(e) {
			dump(e+'\n');
		}
	},
   
/* Event Handling */ 
	
	handleEvent : function(aEvent) 
	{
		switch (aEvent.type)
		{
			case 'load':
				return this.init();
				break;

			case 'unload':
				return this.destroy();

			case 'TabOpen':
				return this.initTab(aEvent.originalTarget);

			case 'TabClose':
				return this.destroyTab(aEvent.originalTarget);

			case 'TabMove':
				return this.onTabMove(aEvent);
		}
	},
 
	onTabMove : function(aEvent) 
	{
		var tab = aEvent.originalTarget;
		this.destroyTab(tab);
		try {
			this.initTab(tab);
		}
		catch(e) {
		}
	},
 
	observe : function(aSubject, aTopic, aData) 
	{
		switch (aTopic)
		{
			case 'nsPref:changed':
				this.onChangePref(aSubject, aTopic, aData);
				break;
		}
	},
  
/* Pref Listener */ 
	
	onChangePref : function(aSubject, aTopic, aPrefName) 
	{
		if (aTopic != 'nsPref:changed') return;

		var value = this.getPref(aPrefName);
		var key   = aPrefName.substring(this.PREFROOT.length + 1);
		switch (key)
		{
			case this.SHOW_BACK_KEY:
			case this.SHOW_FORWARD_KEY:
			case this.SHOW_TAB_KEY:
				var attr = this.SHOW_ATTR_PREFIX + key.match(/[^\.]+$/);
				if (value)
					document.documentElement.setAttribute(attr, true);
				else
					document.documentElement.removeAttribute(attr);
				break;

			case this.ALIGN_KEY:
				document.documentElement.setAttribute(this.ALIGN_ATTR, value);
				break;

			default:
				break;
		}
	},
  
/* Save/Load Prefs */ 
	
	get Prefs() 
	{
		delete this.Prefs;
		this.Prefs = Components
						.classes['@mozilla.org/preferences;1']
						.getService(Components.interfaces.nsIPrefBranch)
						.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
		return this.Prefs;
	},
 
	getPref : function(aPrefstring) 
	{
		switch (this.Prefs.getPrefType(aPrefstring))
		{
			case this.Prefs.PREF_STRING:
				return decodeURIComponent(escape(this.Prefs.getCharPref(aPrefstring)));

			case this.Prefs.PREF_INT:
				return this.Prefs.getIntPref(aPrefstring);

			case this.Prefs.PREF_BOOL:
				return this.Prefs.getBoolPref(aPrefstring);

			case this.Prefs.PREF_INVALID:
			default:
				return null;
		}
	},
 
	setPref : function(aPrefstring, aNewValue) 
	{
		switch (typeof aNewValue)
		{
			case 'string':
				return this.Prefs.setCharPref(aPrefstring, unescape(encodeURIComponent(aNewValue)));

			case 'number':
				return this.Prefs.setIntPref(aPrefstring, parseInt(aNewValue));

			default:
				return this.Prefs.setBoolPref(aPrefstring, aNewValue);
		}
	},
 
	clearPref : function(aPrefstring) 
	{
		if (this.Prefs.prefHasUserValue(aPrefstring))
			this.Prefs.clearUserPref(aPrefstring);
	},
 
	addPrefListener : function(aObserver) 
	{
		var domains = ('domains' in aObserver) ? aObserver.domains : [aObserver.domain] ;
		try {
			for each (var domain in domains)
				this.Prefs.addObserver(domain, aObserver, false);
		}
		catch(e) {
		}
	},
 
	removePrefListener : function(aObserver) 
	{
		var domains = ('domains' in aObserver) ? aObserver.domains : [aObserver.domain] ;
		try {
			for each (var domain in domains)
				this.Prefs.removeObserver(domain, aObserver, false);
		}
		catch(e) {
		}
	},
  
/* nsIWebProgressListener */ 
	onProgressChange : function() {},
	onStatusChange : function() {},
	onSecurityChange : function() {},
	onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus)
	{
		Application.console.log(aWebProgress);
		// ignore not for tab
		if (!(aWebProgress instanceof Components.interfaces.nsIDOMElement))
			return;

		var browser = arguments[0];
		aStateFlags = arguments[3];

		const nsIWebProgressListener = Components.interfaces.nsIWebProgressListener;
		if (
			aStateFlags & nsIWebProgressListener.STATE_STOP &&
			aStateFlags & nsIWebProgressListener.STATE_IS_NETWORK
			) {
			this.updateCountForTab(browser.__historycounter__linkedTab);
		}
	},
	onLocationChange : function(aWebProgress, aRequest, aLocation)
	{
		// ignore for tab
		if (!(aWebProgress instanceof Components.interfaces.nsIWebProgress))
			return;

		this.updateCount();
		window.setTimeout(function(aSelf) { aSelf.updateCount(); }, 0, this);
	},

/* nsIWebProgressListener2 */
	onProgressChange64 : function() {},
	onRefreshAttempted : function() { return true; },

/* nsISupports */
	QueryInterface : function (aIID)
	{
		if (aIID.equals(Ci.nsIWebProgressListener) ||
			aIID.equals(Ci.nsIWebProgressListener2) ||
			aIID.equals(Ci.nsISupports))
			return this;
		throw Components.results.NS_NOINTERFACE;
	}
 
}; 

window.addEventListener('load', HistoryCounterService, false);
window.addEventListener('unload', HistoryCounterService, false);
  
