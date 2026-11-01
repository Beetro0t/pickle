#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/raw" || exit 1
UA="Mozilla/5.0 (compatible; PickleballFinderBot/1.0; +https://pickleballfinder.example/bot)"
fetch() {
  n="$1"; u="$2"
  curl -sSL --max-time 60 -A "$UA" -o "$n" -w "$n %{http_code} %{size_download} %{content_type}\n" "$u" || echo "$n FAILED"
}

fetch nsw_detail_366690.html "https://www.pickleballnsw.org/events/366690" &
fetch nsw_detail_366672.html "https://www.pickleballnsw.org/events/366672" &
fetch nsw_detail_386068.html "https://www.pickleballnsw.org/events/386068" &
fetch nsw_detail_378578.html "https://www.pickleballnsw.org/events/378578" &
wait
fetch nsw_detail_366674.html "https://www.pickleballnsw.org/events/366674" &
fetch nsw_detail_366675.html "https://www.pickleballnsw.org/events/366675" &
fetch nsw_detail_373557.html "https://www.pickleballnsw.org/events/373557" &
fetch nsw_detail_386233.html "https://www.pickleballnsw.org/events/386233" &
wait
fetch nsw_detail_374986.html "https://www.pickleballnsw.org/events/374986" &
fetch nsw_detail_374987.html "https://www.pickleballnsw.org/events/374987" &
fetch nsw_detail_374988.html "https://www.pickleballnsw.org/events/374988" &
fetch nsw_detail_374989.html "https://www.pickleballnsw.org/events/374989" &
wait
fetch nsw_detail_374990.html "https://www.pickleballnsw.org/events/374990" &
fetch nsw_detail_374991.html "https://www.pickleballnsw.org/events/374991" &
fetch nsw_detail_374992.html "https://www.pickleballnsw.org/events/374992" &
fetch nsw_calendar.ics "https://www.pickleballnsw.org/events/calendar/download" &
wait

fetch lmpc_sessions.html "https://www.lmpci.com.au/session-calendar" &
fetch lmpc_event_373763.html "https://www.lmpci.com.au/events/373763" &
fetch lmpc_events_list.html "https://www.lmpci.com.au/events/list" &
fetch coasties_sessions.html "https://www.coastiespickleball.com.au/upcoming-sessions" &
wait
fetch terrigal_sessions.html "https://terrigalpickleball.com.au/sessions/" &
fetch courtyard_events.html "https://thecourtyard.com.au/events" &
fetch pickleballerz_programs.html "https://book.pickleballerz.com.au/programs?facility_id=1232" &
fetch pickleballerz_events.html "https://book.pickleballerz.com.au/f/PickleballerzAU/pages/events-3b6067d6-b258-460e-9c40-cc2bdac617b7" &
wait
fetch podplay_events.json "https://houseofpickle.podplay.app/community/events?location=tuggerah" &
fetch opensports_hunter.json "https://opensports.net/the-hunter-pickleball/tab/events" &
fetch opensports_terrigal.json "https://opensports.net/terrigal-pickleball/tab/events" &
fetch opensports_coasties.html "https://opensports.net/coasties-pickleball-club/tab/events" &
wait

fetch courtyard_whatson.html "https://thecourtyard.com.au/whats-on" &
fetch voyager_programs.html "https://www.voyagertennis.com/programs/pickleball-court-hire-and-coaching-programs-sydney-gosford-and-tweed-heads/" &
fetch pickleballau_places.html "https://pickleballaustralia.org.au/places-to-play/" &
wait
echo "--- detail fetch complete ---"
