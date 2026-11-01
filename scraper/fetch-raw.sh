#!/usr/bin/env bash
# Downloads candidate source pages into scraper/raw for structural review.
# Runs are manual/polite: one request per page, no concurrency beyond 4.
set -u
cd "$(dirname "$0")/raw" || exit 1
UA="Mozilla/5.0 (compatible; PickleballFinderBot/1.0; +https://pickleballfinder.example/bot)"

fetch() {
  n="$1"; u="$2"
  curl -sSL --max-time 60 -A "$UA" -o "$n.html" -w "$n %{http_code} %{size_download}\n" "$u" || echo "$n FAILED"
}

fetch voyager "https://www.voyagertennis.com/our-locations/gpb/" &
fetch hunter "https://www.revolutionise.com.au/thehunterpickleballa/where-to-play-our-venues" &
fetch pcyc_bateau "https://www.pcycnsw.org.au/bateau-bay/" &
fetch pickleballerz "https://book.pickleballerz.com.au/" &
wait
fetch woywoy "https://www.revolutionise.com.au/ccpww/woy-woy-sessions" &
fetch nsw "https://www.pickleballnsw.org/events" &
fetch dink "https://www.thedinksociety.com.au/products/pickleball-social-sessions-sunday-afternoons" &
fetch pcyc_lake "https://www.pcycnsw.org.au/lake-macquarie/" &
wait
fetch lmpc "https://www.lmpci.com.au/home" &
fetch houseofpickle "https://houseofpickle.com.au/locations/tuggerah/" &
fetch coasties "https://www.coastiespickleball.com.au/where-we-play" &
fetch courtyard "https://thecourtyard.com.au/" &
wait
fetch terrigal "https://terrigalpickleball.com.au/" &
fetch barbeach "https://www.barbeachallsports.com.au/pickleball/" &
fetch urbanrec "https://newcastle.urbanrec.com.au/leagues/pickleball" &
fetch totaltennis "https://totaltennislakemac.com.au/pickleball/" &
wait
fetch ywca "https://www.ywcahunterregion.org.au/pickleball" &
fetch stockton "https://play.tennis.com.au/stocktontennisclub/CompsSocial/Pickleball" &
fetch pa_tournaments "https://pickleballaustralia.org.au/tournaments/" &
fetch pa_places "https://pickleballaustralia.org.au/places-to-play/" &
wait
fetch npl "https://www.nationalpickleballleague.com.au/events" &
fetch playpickle_tournaments "https://playpickle.com/tournaments" &
fetch playpickle_social "https://playpickle.com/social-play" &
fetch citysydney "https://whatson.cityofsydney.nsw.gov.au/search?query=pickleball" &
wait
fetch parramatta "https://www.parramatta.nsw.gov.au/events?search=pickleball" &
fetch wpt "https://www.worldpickleballtournaments.com/tournaments" &
wait
echo "--- raw fetch complete ---"
