var HistoryCounterService = { 

	BOX_CLASS_NAME   : 'historycounter-box',
	LABEL_CLASS_NAME : 'historycounter-label',
	 
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
		var count   = history.count;
		var current = history.index;

		var backCount = this.backCount;
		if (backCount) {
			if (current > 0)
				backCount.setAttribute('value', current);
			else
				backCount.removeAttribute('value');
		}

		var forwardCount = this.forwardCount;
		if (forwardCount) {
			var forwardNum = count - current - 1;
			if (forwardNum > 0)
				forwardCount.setAttribute('value', forwardNum);
			else
				forwardCount.removeAttribute('value');
		}
	},
 
/* Initializing */ 
	 
	init : function() 
	{
		if (!('gBrowser' in window)) return;

		window.removeEventListener('load', this, false);

		window.__historycounter__UpdateBackForwardButtons = window.UpdateBackForwardButtons;
		window.UpdateBackForwardButtons = function()
		{
			__historycounter__UpdateBackForwardButtons();
			HistoryCounterService.updateCount();
		};

		var toolbox = document.getElementById('navigator-toolbox');
		if (toolbox.customizeDone) {
			toolbox.__secondsearch__customizeDone = toolbox.customizeDone;
			toolbox.customizeDone = function(aChanged) {
				this.__secondsearch__customizeDone(aChanged);
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

		this.initButtons();

		this.initialized = true;
	},
 
	destroy : function() 
	{
		window.removeEventListener('unload', this, false);
	},
  
/* Event Handling */ 
	 
	handleEvent : function(aEvent) 
	{
		switch (aEvent.type)
		{
			case 'load':
				this.init();
				break;

			case 'unload':
				this.destroy();
				break;
		}
	}
  
}; 

window.addEventListener('load', HistoryCounterService, false);
window.addEventListener('unload', HistoryCounterService, false);
  
