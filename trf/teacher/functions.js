// functions.js

function declineTRF() {

	let token = $("#trf-form #token").val();

	if(token != "") {
		console.log("Declining form... ");
		$("#trf-form").hide();
		$("#decline-menu").hide();

		let formData = new FormData();
		formData.append("dbfunction", "TRF_Decline");
		formData.append("token", token);

		$.ajax("/atdp-db-relay.php", {
			data: formData,
			processData: false,
			contentType: false,
			dataType: "html",
			method: "POST"

		}).then(function(response) {

			console.log(response);
			if(response != "Email sent successfully.") {
				alert("There was an error sending the notification email. No changes have been made.");
			}

			if($("#trf-form #profile-form").length > 0) {
				// we're in single mode!
				window.location.href = "../decline/";
			} else {
				loadTRFData();
			}

		},
		function() {
			alert('Could not save data; AJAX error occurred. Please check your Internet connection.');
		});
	}
}

function getDatefieldString(trfObj) {

	let str = "";
	let reqDate = new Date(trfObj.DateCreated);
	let appDate = new Date(trfObj.AppDate);
	let compDate = new Date(trfObj.DateCompleted);  

	if(reqDate != "Invalid Date") {
		str += "This referral request was created on ";
		str += reqDate.toLocaleDateString('en-us', { year:"numeric", month:"short", day:"numeric", timeZone: 'UTC'}) + ".";
	}

	if(compDate != "Invalid Date") {
		str += " It was completed on ";
		str += compDate.toLocaleDateString('en-us', { year:"numeric", month:"short", day:"numeric", timeZone: 'UTC'}) + ".";
	}
	else if(appDate != "Invalid Date") {
		str += " This student intends to submit their application by ";
		str += appDate.toLocaleDateString('en-us', { year:"numeric", month:"short", day:"numeric", timeZone: 'UTC'}) + ".";
		str += " Students have been advised to give their teacher at least a week's notice.";
	}

	return str;
}

function getStatusString(trfObj) {

	let statusString = "";

	switch(trfObj.Status) {
		case "Complete; linked to app":
			statusString = "Complete";
			break;
		case "Complete; code sent":
			statusString = "Complete";
			break;
		case "App request sent":
			statusString = "Awaiting feedback";
			break;
		case "Student request sent":
			statusString = "Awaiting feedback";
			break;
		default:
			statusString = trfObj.Status;
	}

	let thisDate = new Date(trfObj.DateCompleted); // note: this is a local (Pacific) date, but JS interprets it as UTC
	let dateCompleted = thisDate.toLocaleDateString('en-us', { year:"numeric", month:"short", day:"numeric", timeZone: 'UTC'});

	if((dateCompleted != "Invalid Date") & (statusString == "Complete")) {
		statusString += "d "+dateCompleted
	}

	if((statusString == "Awaiting feedback") & (isTRFActive(trfObj) == false)) {
		statusString = "Not completed";
	}

	return statusString;
}

function initTRF() {
	// test connection first thing!
	$.ajax({
	    url : '/atdp-db-relay.php',
	    type : 'POST',
	    timeout : 8000,
	    data : {
	    	'dbfunction' : 'XML_FindSchools',
	    	'contenttype' : 'text/xml',
	        'schoolname' : 'dev'
	    },
	    success : function(data) {
	        console.log('Connection confirmed.');
	    },
	    error : function(request,error)
	    {
	        console.log('Cannot connect to database!');
	        console.log(request);
	        console.log(error);
	        $("#ajax-error").show();
	    }
	});

	// set up school autocomplete script
    var options = {
        script: "/atdp-ajax-relay.php?dbfunction=XML_FindSchools&",
        varname: "schoolname",
        json: false,
        maxentries: 6,
        noresults: "No school found; please check your spelling or leave written in if not listed.",
        timeout: 120000,
        delay: 150,
        minchars: 2,
        offsety: -780,
        callback: storeSchool
    };
    var as = new bsn.AutoSuggest('teacher-school', options);

    $("#incomplete-warning").show();
	$("#submit").hide();
	$("#complete-text").hide();
	$("#math-field").hide();
	$("#math-grade-field").hide();
	$("#trf-form").hide();

    loadTRFData();
    registerEvents();
}

function initTRFSingle() {
	// test connection first thing!
	$.ajax({
	    url : '/atdp-db-relay.php',
	    type : 'POST',
	    timeout : 8000,
	    data : {
	    	'dbfunction' : 'XML_FindSchools',
	    	'contenttype' : 'text/xml',
	        'schoolname' : 'dev'
	    },
	    success : function(data) {
	        console.log('Connection confirmed.');
	    },
	    error : function(request,error)
	    {
	        console.log('Cannot connect to database!');
	        console.log(request);
	        console.log(error);
	        $("#ajax-error").show();
	    }
	});

	// set up school autocomplete script
    var options = {
        script: "/atdp-ajax-relay.php?dbfunction=XML_FindSchools&",
        varname: "schoolname",
        json: false,
        maxentries: 6,
        noresults: "No school found; please check your spelling or leave written in if not listed.",
        timeout: 120000,
        delay: 150,
        minchars: 2,
        offsety: -780,
        callback: storeSchool
    };
    var as = new bsn.AutoSuggest('schoolname', options);

    $("#incomplete-warning").show();
	$("#complete-text").hide();
	$("#math-field").hide();
	$("#math-grade-field").hide();

	let trfToken = $("body")[0].dataset.requestedtrf;

	let jsonReq = new FormData();
	jsonReq.append("dbfunction", "TRF_EchoJSON_Single");
	jsonReq.append("token", trfToken);

	$.ajax("/atdp-db-relay.php", {
		data: jsonReq,
		processData: false,
		contentType: false,
		dataType: "html",
		method: "POST"  //so we use the right db-relay settings!!

	}).then(function(data) {

		if(data == "No TRF found") {
			window.location.href = "../invalid/";
		} else if(data == "TRF not active") {
			window.location.href = "../lapsed/";
		} else {
			allData = JSON.parse(data);

			console.log('Data transfer successful.');
			console.log(allData);

			loadProfile(allData.profile)
			loadTRFForm(0,true);			
		}



	},
	function() {
		alert('Could not load data; AJAX error occurred. Please check your Internet connection.');
	});

    registerEvents();
    
}

function isTRFActive(trfObj) {

	if (trfObj.Status.includes("Complete")) {
		return false;
	}
	if (trfObj.Status.includes("Declined")) {
		return false;
	}
	else {
		// base on date
		return isTRFCurrentYear(trfObj);
	}
}

function isTRFCurrentYear(trfObj) {

	let today = new Date();
	
	let expireDate;
	if(today.getMonth >= 8) {  // 8 = Sept
		// we're in Sept-Dec: this year's TRFs are now old
		expireDate = new Date(today.getFullYear(), 8, 1);

	} else {
		// we're in Jan-Aug: include last year's Sept-Dec
		expireDate = new Date((today.getFullYear()-1), 8, 1);
	}

	let thisDate = new Date(trfObj.DateCreated);
	if(expireDate < thisDate) {
		// current TRF!
		return true;
	}
	else {
		// old TRF
		return false;
	}
}

function loadProfile(data) {
	$("#profile-form input#teacher-fname").val(data.Firstname);
	$("#profile-form input#teacher-lname").val(data.Lastname);
	$("#profile-form input#teacher-email").val(data.Email);
	$("#profile-form input#teacher-school").val(data.InstituteName);
	$("#profile-form input#school-id").val(data.SchoolID);
	$("#profile-form input#teacher-subject").val(data.Title);
	$("#profile-form input#teacher-grades").val(data.Grade);
}

function loadSessions(data) {

	let sessionList = $("#signout-menu details ul");

	let devCount = data.length+" device";
	if(data.length > 1) { devCount += "s" };

	$("#signout-menu summary > span").html(devCount);

	sessionList.empty();
	for(var sesh in data) {

		let str = "";

		str += "<span class='ip'>IP "+data[sesh].IPAddress+"</span> ";

		let thisDate = new Date(data[sesh].DateCreated); // note: this is a local (Pacific) date, but JS interprets it as UTC
		let dateCreated = thisDate.toLocaleDateString('en-us', { year:"numeric", month:"short", day:"numeric", timeZone: 'UTC'});

		str += "<span class='signin'> signed in since <span class='date'>"+dateCreated+"</span> ";

		let time = data[sesh].TimeCreated;

		let timeDate = new Date(data[sesh].TimeCreated * 1000); // multiply by 1000 because Date() requires miliseconds
		let timeStr = timeDate.getUTCHours()+":"+timeDate.getUTCMinutes();
		str += "at <span class='time'>"+timeStr+"</span>";
		str += "</span><br>"; 
		str += "<span class='agent'>"+data[sesh].UserAgent+"</span> ";

		sessionList.append("<li>"+str+"</li>");

	}
}

function loadTRFData() {

	let jsonData;

	let jsonReq = new FormData();
	jsonReq.append("dbfunction", "TRF_EchoJSON");

	$.ajax("/atdp-db-relay.php", {
		data: jsonReq,
		processData: false,
		contentType: false,
		dataType: "html",
		method: "POST"

	}).then(function(data) {

		allData = JSON.parse(data);

		// sort TRF data
		allData.trfs.sort(function(a, b) {
			if(isTRFActive(a) & !(isTRFActive(b))) {
				return -1;
			} else if(isTRFCurrentYear(a) & !(isTRFCurrentYear(b))) {
				return -1;
			} else if(a.dateCreated > b.dateCreated) {
				return -1;
			} else {
				return 1;
			}
		});
		
		console.log('Data transfer successful.');
		console.log(allData);

		$("#signed-in-as").html(allData.profile.Email);

		loadTRFTable(allData.trfs);
		loadProfile(allData.profile);
		loadSessions(allData.sessions);

		// is the profile complete?
		if(allData.profile.Firstname == "" | 
		   allData.profile.Lastname == "" | 
		   allData.profile.InstituteName == "" |
		   allData.profile.Title == "" | 
		   allData.profile.Grade == "" )
		{
			console.log("Profile not complete!");
			setScrollable(false);
			$("#trf-list").hide();
			$("#close-profile").hide();
			$("#save-profile")[0].innerHTML = "Get started!";
			$("#profile-menu").show();
			$("#profile-form input").attr( "required", "required" );

			if(newTeacher) {
				console.log("New teacher, show onboarding message");
				$("#onboarding-message").show();
			} else {
				$("#onboarding-message").hide();
			}

		} else {
			$("#close-profile").show();
			$("#save-profile")[0].innerHTML = "Save changes";
			$("#profile-form input").removeAttr( "required" );
		}


		// is there a request to go straight to a form?
		let reqToken = $("body")[0].dataset.requestedtrf;
		if(typeof reqToken !== 'undefined') {

			console.log("checking for requested TRF...");
			reqToken = $("body")[0].dataset.requestedtrf;
			$("body").removeAttr("data-requestedtrf"); // so we don't keep trying to load it
			console.log(reqToken);

			// get index of requested TRF, or -1 if not found
			let foundTRF = allData.trfs.findIndex(o => o.Token.toUpperCase() === reqToken.toUpperCase());

			if(foundTRF !== -1) {

				if(isTRFActive(allData.trfs[foundTRF])) {

					console.log("Requested TRF found and is active; loading form! " + foundTRF);
					loadTRFForm(foundTRF, true);
				}
				else {
					console.log("Requested TRF located, but inactive!");
				}
				
			} else {
				console.log("Requested TRF not found!");
			}
			
		}

	},
	function() {
		alert('Could not load data; AJAX error occurred. Please check your Internet connection.');
	});
}

function loadTRFForm(i, writable) {
	// loads existing data from object at index i
	// writable (boolean): whether inputs are writable or read-only

	let trfData = allData.trfs;

	console.log("Loading form for "+trfData[i].TRFCode);

	$("#math-field").hide();
	$("#math-grade-field").hide();
	$("#course-field").show();

	$("#datefields").html(getDatefieldString(trfData[i]));
	$("#resend-status").removeAttr("class").html("");

	if(trfData[i].StudentName == ""){
		$("#trf-form h1 span.studentName").html("");
		$("#trf-form input#studentname").val("");
	} else {
		$("#trf-form h1 span.studentName").html("for "+trfData[i].StudentName);
		$("#trf-form input#studentname").val(trfData[i].StudentName);
	}
	
	$("#trf-form input#schoolname").val(allData.profile.InstituteName);
	$("#trf-form input#grades").val(allData.profile.Grade);

	$("#trf-form input#trfcode").val(trfData[i].TRFCode);
	$("#trf-form input#token").val(trfData[i].Token);
	$("#trf-form input#course").val(trfData[i].CourseTaught);

	if(trfData[i].MathGrade != "") {
		$("#trf-form input#mathgrade").val(trfData[i].MathGrade);
		$("#math-grade-field").show();
	}
	
	$("#trf-form #comments-a").val(trfData[i].Comments);
	$("#trf-form #comments-b").val(trfData[i].Supports);

	$("#math-checkbox").prop("checked", false);

	$("#trf-form :radio").prop("checked", false).attr('disabled', false); // reset radio buttons

	for (var q = 1; q < 13; q++) {
		let key = "Q"+q+"Response";
		switch (trfData[i][key]) {
			case "NA":
				$("#q"+q+"-na").prop("checked", true);
				break;
			case "Rarely":
				$("#q"+q+"-rarely").prop("checked", true);
				break;
			case "Sometimes":
				$("#q"+q+"-sometimes").prop("checked", true);
				break;
			case "Frequently":
				$("#q"+q+"-frequently").prop("checked", true);
				break;
			case "Almost Always":
				$("#q"+q+"-almost-always").prop("checked", true);
				break;
		}
	}

	if(writable) {
		$("#trf-form").removeAttr("class").addClass("write");
		$("#trf-form input, #trf-form textarea").not("#trfcode, #teacher-email").prop("readonly", false);
		$("#math-check").show();
		$("#submit-set").show();
		$("#declinefield").show();
	} else {
		$("#trf-form").removeAttr("class").addClass("read");
		if(isTRFCurrentYear(trfData[i])) {
			$("#trf-form").addClass("current");
		}
		$("#trf-form input, #trf-form textarea").not("#trfcode").prop("readonly", true);
		$(':radio:not(:checked)').attr('disabled', true);
		$("#math-check").hide();
		$("#submit-set").hide();
		$("#declinefield").hide();
		$("#course-field").show();
	}

	if(trfData[i].MathGrade == "") {
		$("#math-grade-field").hide();
	} else {
		$("#math-grade-field").show();
	}

	$(window).scrollTop(0);
	$("#trf-form").show(150, () => { $("#trf-list").hide(); });
	
	

	// $("#trf-form").attr("class","").addClass("active");
}

function loadTRFFormBlank() {

	console.log("Loading blank form for new referral");

	$("#trf-form h1 span.studentName").html("");
	$("#trf-form input#studentname").val("");

	$("#math-field").hide();
	$("#math-grade-field").hide();
	$("#course-field").show();

	$("#datefields").html("");

	$("#trf-form input#schoolname").val(allData.profile.InstituteName);
	$("#trf-form input#grades").val(allData.profile.Grade);

	$("#trf-form input#studentname").val("");
	$("#trf-form input#trfcode").val("");
	$("#trf-form input#token").val("");
	$("#trf-form input#course").val("");
	$("#trf-form input#mathgrade").val("");
	$("#trf-form #comments-a").val("");
	$("#trf-form #comments-b").val("");

	$("#math-checkbox").prop("checked", false);

	$("#trf-form :radio").prop("checked", false).attr('disabled', false); // reset radio buttons

	$("#trf-form").removeAttr("class").addClass("write blank");
	$("#trf-form input, #trf-form textarea").not("#trfcode").prop("readonly", false);
	$("#math-check").show();
	$("#submit-set").show();
	$("#declinefield").hide();

	$(window).scrollTop(0);
	$("#trf-form").show(150, () => { $("#trf-list").hide(); });
}

function loadTRFTable(data) {

	// console.log(data);

	$("#trf-list table").empty();
	// $("#trf-list").prepend("<table></table>");

	if(data.length == 0) {
		$("#trf-list table").append("<tr class='old'><th colspan='5'><h2>No requests yet!</h2></th></tr>");
		$("#trf-list table").append("<tr class='old'><td colspan='5'>Use the &ldquo;Refer another student&rdquo; button to refer a student who hasn't sent you a request.</td></tr>");
	}

	let trClass = "active";

	for(var row in data) {
		// console.log("Adding data row...");

		if(data[row].StudentName == "") {
			studentName = "(No name provided)";
		} else {
			studentName = data[row].StudentName;
		}

		let thisDate = new Date(data[row].DateCreated); // note: this is a local (Pacific) date, but JS interprets it as UTC
		let dateCreated = thisDate.toLocaleDateString('en-us', { year:"numeric", month:"short", day:"numeric", timeZone: 'UTC'});

		thisDate = new Date(data[row].AppDate); // note: this is a local (Pacific) date, but JS interprets it as UTC
		let appDate = thisDate.toLocaleDateString('en-us', { year:"numeric", month:"short", day:"numeric", timeZone: 'UTC'});
		if(appDate == "Invalid Date") {
			appDate = "None provided";
		}

		let active = isTRFActive(data[row]);
		let current = isTRFCurrentYear(data[row]);

		if(active) {
			// active TRF!
			trClass = "active";
			if (row == 0) {
				$("#trf-list table").append("<tr><th colspan='5'><h2>To do</h2></th></tr>")
				$("#trf-list table").append("<tr class='headers'><th>Student</th><th>Request created</th><th>Est. application date <i class='fa fa-question-circle tooltip-container' aria-hidden='true'><div class='tooltip'>This student intends to submit their application by the indicated date. Applications cannot be submitted without a completed teacher referral.</div></i></th><th>Request status</th><th></th></tr>");
			}
		} else {
			// old TRF
			if(trClass == "active") {
				newTeacher = false;
				$("#trf-list table").append("<tr id='older'><th colspan='5'><h2>Previous referrals</h2></th></tr>");
				$("#trf-list table").append("<tr class='headers'><th>Student</th><th>Request created</th><th>Est. application date</th><th>Request status</th><th></th></tr>");

			}
			if(current) {
				trClass = "current";  // current year & finished
			} else {
				trClass = "old";  // previous years
			}
			
		}


		let statusString = getStatusString(data[row]);

		let thisRow = "<tr class="+trClass+">";
		thisRow += "<td><i class='fa fa-caret-right' aria-hidden='true'></i>"+studentName+"</td>";
		thisRow += "<td>"+dateCreated+"</td>";
		thisRow += "<td>"+appDate+"</td>";
		thisRow += "<td>"+statusString+"</td>";
		thisRow += "<td id='trf_"+row+"' class='action'>";
		if((statusString.includes("Complete")) & (current)) {
			thisRow += "<button class='view-resend'>View / resend</button>";
		} else if ((statusString.includes("Complete")) & (active==false)) {
			thisRow += "<button class='view'>View</button>";
		} else if (statusString.includes("Awaiting feedback")) {
			thisRow += "<button class='open'>Complete form</button>";
		}
		thisRow += "</td>";
		thisRow += "</tr>";
		$("#trf-list table").append(thisRow);
	}

	$("#trf-list").show();
}

function registerEvents() {

	$("#trf-list").on("click", "td.action button", function(e) {

		elClicked = $(e.target);
		index = parseInt(elClicked.parent().attr("id").replace("trf_", ""));
		active = elClicked.parent().parent().hasClass("active");
		loadTRFForm(index, active);
	});

	$("#trf-list").on("click", "#edit-profile", function(e) {

		console.log("Edit teacher profile...");
		$("#trf-list").hide();
		$("#profile-menu").show();
		$("#trf-form").hide();
	});

	$("#trf-list").on("click", "#refer-new", function(e) {

		console.log("Show blank referral form...");
	});



	$("#refer-new").click(function() {
		loadTRFFormBlank();
	});

	$("#math-checkbox").change(function() {
		if($("#math-checkbox").is(':checked')) {
			$("#math-field").show(200);
			$("#math-course").prop("required", true);
			$("#mathgrade").prop("required", true);
			$("#course-field").hide(200);
			$("#math-grade-field").show(200);
		} else {
			$("#math-course option:first-child").prop('selected', true);
			$("#math-course").prop("required", false);
			$("#mathgrade").prop("required", false);
			$("#math-field").hide(200);
			$("#course-field").show(200);
			$("#math-grade-field").hide(200);
		}
	});

	$('#math-course').change(function() {
		if($(this).val() == "Other") {
			$("#course-field").show(300);
			$("#course").val("");
		} else {
			$("#course-field").hide();
			$("#course").val($(this).val());
		}
	});

	$("#trf-form").on("click","#close-trf-form",function(e) {

		if($("#trf-form").hasClass("write")) {
			loadTRFData();  // reload in case any changes were made
		}
		else {
			$("#trf-list").show(); // manually display list (no reload)
		}
		
		$("#trf-form").hide();
		$(window).scrollTop(0);
	});

	$("#close-profile").click(function() {
		$("#trf-list").show();
		$("#profile-menu").hide();
		$(window).scrollTop(0);
	});

	$("#declinefield span").click(function() {
		$("#decline-menu").show();
	});

	$("#cancel-decline").click(function() {
		$("#decline-menu").hide();
	});

	$("#confirm-decline").click(function() {
		declineTRF();
	});

	$("#trf-list").on("click", "#sign-out", function(e) {

		console.log("Sign out dialogue...");
		$("#signout-menu").show();
	});

	$("#cancel-signout").click(function() {
		$("#signout-menu").hide();
	});

	$("#confirm-signout").click(function() {
		window.location.href = "logout.php";
	});

	$("#trf-form form").submit(function(e) {
		e.preventDefault();

		// $(window).scrollTop(0);
		submitTRFForm();
	});

	$("#trf-form input, #trf-form textarea, #trf-form select").change(function() {
		saveTRFData();
	});

	$("#save-profile").click(function(e) {
		// $("#profile-menu form").submit();
		
		saveProfile();
	});

	$("#profile-menu form").submit(function(e) {
		e.preventDefault();
	});

	$("#onboarding-message button").click(function() {
		$("#onboarding-message").slideUp(200);
	});

	$("#trf-form #resend-email").click(function(e) {
		e.preventDefault();
		resendTRF();
	});
}

function resendTRF() {
	console.log("Requesting to resend TRF info...");

	if($("#trf-form #token").val() == "") {
		alert("Cannot resend info for a referral form that has never been submitted!");
	}
	else {

		$("#resend-status").removeAttr("class").html("<i class='fa fa-spinner fa-pulse fa-3x fa-fw'></i> Sending...");

		let formData = new FormData();
		formData.append("dbfunction", "TRF_TeacherResend");
		formData.append("token", $("#trf-form #token").val());

		$.ajax("/atdp-db-relay.php", {
			data: formData,
			processData: false,
			contentType: false,
			dataType: "html",
			method: "POST"

		}).then(function(response) {

			console.log(response);
			if(response == "Email sent successfully.") {
				$("#resend-status").addClass("success").html("<i class='fa fa-check' aria-hidden='true'></i> Email sent!");
			}
			else {
				$("#resend-status").addClass("error").html("<i class='fa fa-exclamation-triangle' aria-hidden='true'></i> Error sending email");
			}

		},
		function() {
			alert('Could not save data; AJAX error occurred. Please check your Internet connection.');
		});
	}
}

function saveProfile() {
	console.log("Submitting form... ");

	if($("#profile-form input:invalid").length > 0) {

		console.log("Required profile fields incomplete!");
		$('#profile-incomplete-warning').fadeIn(90).delay(1500).fadeOut(190);

	} else {

		let formData = new FormData($("#profile-form")[0]);
		formData.append("dbfunction", "TRF_TeacherSaveProfile");

		$.ajax("/atdp-db-relay.php", {
			data: formData,
			processData: false,
			contentType: false,
			dataType: "html",
			method: "POST"

		}).then(function(response) {

			console.log(response);
			if(response != "Profile updated") {
				alert("Error saving profile! Please try again in a minute.\n\nError message: "+response);
				window.location.href = "/trf/teacher/";  //reload page in case of outage
			}
			loadTRFData();

		},
		function() {
			alert('Could not save data; AJAX error occurred. Please check your Internet connection.');
		});

		$("#profile-menu").hide();
		newTeacher = false;
		setScrollable(true);
	}
}

function saveTRFData() {

	let formData = new FormData($("#trf-form form")[0]);
	formData.append("dbfunction", "TRF_TeacherSaveProgress");

	$.ajax("/atdp-db-relay.php", {
		data: formData,
		processData: false,
		contentType: false,
		dataType: "html",
		method: "POST"

	}).then(function(response) {

		console.log(response);

	},
	function() {
		alert('Could not save data; AJAX error occurred. Please check your Internet connection.');
	});
}

function setScrollable(scrollable) {

	if(scrollable) {
		$("body").removeClass("noscroll");
	} else {
		$("body").addClass("noscroll");
	}
}

function storeSchool(schoolObj) {
	$('#teacher-school').val(schoolObj.value);
	$('#school-id').val(schoolObj.id);
	console.log(schoolObj.id);
}

function submitTRFForm() {
	console.log("Submitting form... ");
	$("#trf-form").hide();

	let formData = new FormData($("#trf-form form")[0]);
	formData.append("dbfunction", "TRF_TeacherSubmit");

	$.ajax("/atdp-db-relay.php", {
		data: formData,
		processData: false,
		contentType: false,
		dataType: "html",
		method: "POST"

	}).then(function(response) {

		console.log(response);

		if($("#trf-form #profile-form").length > 0) {
			// we're in single mode!
			window.location.href = "../finish/";
		} else {
			if(response != "Email success") {
				alert("There was an problem sending email notifications. (It's likely the applicant provided an invalid email address.) Your form has still been recorded, and you can review or try to resend it if needed.");
			}
			loadTRFData();
		}
		

	},
	function() {
		alert('Could not save data; AJAX error occurred. Please check your Internet connection.');
	});
}
