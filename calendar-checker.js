let events_this_week = [];
let exclusion_tags = ['TTC', 'CARMS', 'IF', 'PC IF'];

function is_c2022(evt) {
	return evt['Tags'].some(r => exclusion_tags.includes(r))
}

function formatEventsList(prep_only, filter) {
    const DIVIDER = "\n\n-----------------------------------------------\n\n";
    let fields = ['Title', 'Tags', 'Date', 'Meeting Link', 'Prep', 'Session Notes', 'Url'];
	let today = new Date();
    let text = "Generated on: " + today.toLocaleString() + DIVIDER;

    for (let i = events_this_week.length - 1; i >= 0; --i) {
		if (prep_only && (today > new Date(events_this_week[i]['StartUtc']) || !events_this_week[i]['Prep'] || events_this_week[i]['Prep'] == 'There is no required preparation for this session.')) { 
            continue; 
        } else if (filter && filter(events_this_week[i])) {
			continue;
		}
        for (let j = 0; j < fields.length; ++j) {
            text += fields[j] + ': ' + events_this_week[i][fields[j]] + '\n';
        }
        text += DIVIDER;
    }
    console.log(text);
}

function parseCalendar(url) {
    let request_index = 0;
    let ongoing = 0;
    let done_sending = false;

    function checkSession(element) {
        let event = {};
        event['Title'] = element['Title'];
        
        let date = new Date(element['StartUtc']);
        event['StartUtc'] = element['StartUtc'];
        event['Date'] = date.toLocaleDateString() + " " + element['MetaData']['TimeTemplate'];
        event['Url'] = "https://www.medportal.ca" + element['MetaData']['DetailUrl'];

        let index = request_index;
        ++request_index;
        ++ongoing;
        
        $.get(event['Url']).then((response) => {
            --ongoing;
            response = response.substring(
                response.indexOf('<div id="session-detail-wrapper"'),
                response.indexOf('<section id="widget-wrapper"')
                );
            let doc = $(new DOMParser().parseFromString(response, "text/html"));
			event['Tags'] = [];
			doc.find('span.badge').each((idx, tag) => {
				event['Tags'][idx] = tag.innerText;
			});
            event['Meeting Link'] = doc.find('h4:contains("video conference session link")').next().text().trim();
            event['Prep'] = doc.find('h2:contains("Required Preparation")').next().text().trim();
            event['Session Notes'] = doc.find('.notes-wrapper').text().trim();
            events_this_week[index] = event;

            if (done_sending && ongoing === 0) {
                formatEventsList(false, is_c2022);
            }
        });
    }

    $.get(url).then((data) => {
        data['Sessions'].forEach(checkSession);
        done_sending = true;
    });
}

parseCalendar("https://www.medportal.ca/RestApi/sessions?page=1&skip=0&take=100&pageSize=100&start=%222020-12-01T04%3A00%3A00.000Z%22&end=%222021-04-01T04%3A00%3A00.000Z%22&searchtext=&mode=Month&resources=%5B%7B%22text%22%3A%22Academic+Session%22%2C%22value%22%3A%22Telerik.Sitefinity.DynamicTypes.Model.Session.AcademicSessionDate%22%2C%22color%22%3A%22%2351a0ed%22%7D%2C%7B%22text%22%3A%22Procomp+Session%22%2C%22value%22%3A%22Telerik.Sitefinity.DynamicTypes.Model.Session.Procompsessiondate%22%2C%22color%22%3A%22%2366bb6a%22%7D%5D&filterexpression=&format=json");
