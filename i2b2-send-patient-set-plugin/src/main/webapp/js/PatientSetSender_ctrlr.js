i2b2.PatientSetSender.Init = function (loadedDiv) {
	// register DIV as valid DragDrop target for Patient Record Sets (PRS) objects
	var op_trgt = {dropTarget: true};
	i2b2.sdx.Master.AttachType("Dem1Set-PRSDROP", "PRS", op_trgt);
	// drop event handlers used by this plugin
	i2b2.sdx.Master.setHandlerCustom("Dem1Set-PRSDROP", "PRS", "DropHandler", i2b2.PatientSetSender.prsDropped);

	// manage YUI tabs
	this.yuiTabs = new YAHOO.widget.TabView("Dem1Set-TABS", {activeIndex: 0});
	this.yuiTabs.on('activeTabChange', function (ev) {
		//Tabs have changed 
		if (ev.newValue.get('id') == "Dem1Set-TAB1") {
			// user switched to Results tab
			if (i2b2.PatientSetSender.model.prsRecord) {
				// contact PDO only if we have data
				if (i2b2.PatientSetSender.model.dirtyResultsData) {
					// recalculate the results only if the input data has changed
					i2b2.PatientSetSender.getResults();
				}
			}
		}
	});

	z = $('anaPluginViewFrame').getHeight() - 34;
	$$('DIV#Dem1Set-TABS DIV.Dem1Set-MainContent')[0].style.height = z;
	$$('DIV#Dem1Set-TABS DIV.Dem1Set-MainContent')[1].style.height = z;
	$$('DIV#Dem1Set-TABS DIV.Dem1Set-MainContent')[2].style.height = z;

	new Ajax.Request(i2b2.PatientSetSender.EUREKA_SERVICES_URL + '/api/protected/destinations?type=PATIENT_SET_EXTRACTOR', {
		method: 'get',
		contentType: 'application/json',
		asynchronous: false,
		onSuccess: function (response) {
			//$$("DIV#Dem1Set-mainDiv DIV#Dem1Set-TABS DIV.results-working")[0].hide();			
			//$$("DIV#Dem1Set-mainDiv DIV#Dem1Set-TABS DIV.results-finished")[0].show();
			//$$("DIV#Dem1Set-mainDiv DIV#Dem1Set-TABS DIV.results-finished")[0].innerHTML = "Patient set send has been requested";
			var destinations = JSON.parse(response.responseText);
			var s = "<select>";
			for (var i = 0; i < destinations.length; i++) {
				s += '<option value="' + destinations[i].name + '">' + destinations[i].name + '</option>';
			}
			s += "</select>"
			$$("DIV#Dem1Set-mainDiv DIV#Dem1Set-TABS DIV#Dem1Set-SelectDest")[0].innerHTML = s;
		},
		onFailure: function (response) {
			alert('The results from the server could not be understood.  Press F12 for more information.');
			console.error("Bad Results from Cell Communicator: ", response);
		},
		onComplete: function (response) {
			//i2b2.PatientSetSender.model.dirtyResultsData = false;
		}
	});

};

i2b2.PatientSetSender.Unload = function () {
	// purge old data
	i2b2.PatientSetSender.model.prsRecord = false;
	return true;
};

i2b2.PatientSetSender.prsDropped = function (sdxData) {
	sdxData = sdxData[0];	// only interested in first record
	// save the info to our local data model
	i2b2.PatientSetSender.model.prsRecord = sdxData;
	// let the user know that the drop was successful by displaying the name of the patient set
	$("Dem1Set-PRSDROP").innerHTML = i2b2.h.Escape(sdxData.sdxInfo.sdxDisplayName);
	// temporarly change background color to give GUI feedback of a successful drop occuring
	$("Dem1Set-PRSDROP").style.background = "#CFB";
	setTimeout("$('Dem1Set-PRSDROP').style.background='#DEEBEF'", 250);
	// optimization to prevent requerying the hive for new results if the input dataset has not changed
	i2b2.PatientSetSender.model.dirtyResultsData = true;
};

i2b2.PatientSetSender.getResults = function () {
	if (i2b2.PatientSetSender.model.dirtyResultsData) {
		$$("DIV#Dem1Set-mainDiv DIV#Dem1Set-TABS DIV.results-directions")[0].hide();
		$$("DIV#Dem1Set-mainDiv DIV#Dem1Set-TABS DIV.results-finished")[0].hide();
		$$("DIV#Dem1Set-mainDiv DIV#Dem1Set-TABS DIV.results-working")[0].show();

		new Ajax.Request(i2b2.PatientSetSender.SERVICE_URL + '/api/protected/patientset', {
			method: 'get',
			dataType: 'json',
			asynchronous: true,
			parameters: {
				resultInstanceId: i2b2.PatientSetSender.model.prsRecord.sdxInfo.sdxKeyValue,
				action: $$("DIV#Dem1Set-mainDiv DIV#Dem1Set-TABS DIV#Dem1Set-SelectDest SELECT")[0].getValue()
			},
			onSuccess: function (response) {
				if (!response.responseText) {
					alert('Error retrieving patient set.');
					$$("DIV#Dem1Set-mainDiv DIV#Dem1Set-TABS DIV.results-working")[0].hide();
					$$("DIV#Dem1Set-mainDiv DIV#Dem1Set-TABS DIV.results-finished")[0].show();
					$$("DIV#Dem1Set-mainDiv DIV#Dem1Set-TABS DIV.results-finished")[0].innerHTML = "Sending patient set failed.";
				} else {
					var patientSet = JSON.parse(response.responseText);
					$$("DIV#Dem1Set-mainDiv DIV#Dem1Set-TABS DIV.results-working")[0].innerHTML = "<form id=\"patientSetSenderForm\" method=\"POST\" action=\"" + i2b2.PatientSetSender.RECEIVER_SEND_URL + "\" target=\"_blank\"></form>";
					$("patientSetSenderForm").request({
						parameters: i2b2.PatientSetSender.contextualize(patientSet),
						onSuccess: function (response) {
							$$("DIV#Dem1Set-mainDiv DIV#Dem1Set-TABS DIV.results-working")[0].hide();
							$$("DIV#Dem1Set-mainDiv DIV#Dem1Set-TABS DIV.results-finished")[0].show();
							$$("DIV#Dem1Set-mainDiv DIV#Dem1Set-TABS DIV.results-finished")[0].innerHTML = "Patient set sent successfully.";
						},
						onFailure: function (response) {
							$$("DIV#Dem1Set-mainDiv DIV#Dem1Set-TABS DIV.results-working")[0].hide();
							$$("DIV#Dem1Set-mainDiv DIV#Dem1Set-TABS DIV.results-finished")[0].show();
							$$("DIV#Dem1Set-mainDiv DIV#Dem1Set-TABS DIV.results-finished")[0].innerHTML = "Patient set could not be sent: " + response.responseText + ".";
						}
					}); 
					
				}
			},
			onFailure: function (response) {
				alert('Error retrieving patient set.');
				$$("DIV#Dem1Set-mainDiv DIV#Dem1Set-TABS DIV.results-working")[0].hide();
				$$("DIV#Dem1Set-mainDiv DIV#Dem1Set-TABS DIV.results-finished")[0].show();
				$$("DIV#Dem1Set-mainDiv DIV#Dem1Set-TABS DIV.results-finished")[0].innerHTML = "Patient set could not be sent: " + response.responseText + ".";
			},
			onComplete: function (response) {
				i2b2.PatientSetSender.model.dirtyResultsData = false;
			}
		});
	}
};
