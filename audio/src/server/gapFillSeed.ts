import type { GapBlank, GapFillCategory, GapFillExercise } from '../types/hub.ts';
import { EXTENDED_GAP_EXERCISES } from './gapFillExtended.ts';

interface RawSeedExercise {
  category: GapFillCategory;
  airportIcao: string;
  airportName: string;
  facility: string;
  title: string;
  voiceRole: 'single_broadcast' | 'atc_pilot_exchange';
  spokenScript: string;
  templateText: string;
  blanks: Array<{
    answer: string;
    accepted?: string[];
    hint: string;
  }>;
}

const RAW_EXERCISES: RawSeedExercise[] = [
  // ======================== 1. ATIS (10 exercises) ========================
  {
    category: 'atis',
    airportIcao: 'LFBO',
    airportName: 'Toulouse-Blagnac',
    facility: 'ATIS 123.125',
    title: 'LFBO Toulouse-Blagnac — Information Bravo',
    voiceRole: 'single_broadcast',
    spokenScript:
      'Toulouse Blagnac information Bravo, time zero eight three zero Zulu. Expect ILS approach runway three two left. Departures runway three two right. Surface wind two niner zero degrees, one two knots. Visibility one zero kilometres, few clouds at three thousand five hundred feet. Temperature one six, dew point zero niner. QNH one zero one eight hectopascals. Transition level six five. Confirm information Bravo on initial contact.',
    templateText:
      'Toulouse-Blagnac Information {{0}}, time 08:30Z. Expect ILS approach Runway {{1}}. Departures Runway 32R. Surface wind {{2}} degrees, 12 knots. Visibility 10 km, few clouds at 3,500 ft. Temperature 16, dew point 09. QNH {{3}} hPa. Transition level {{4}}.',
    blanks: [
      { answer: 'Bravo', accepted: ['B', 'bravo'], hint: 'ATIS letter' },
      { answer: '32L', accepted: ['32 left', '32l', 'three two left'], hint: 'Approach runway' },
      { answer: '290', accepted: ['290', 'two niner zero'], hint: 'Wind direction (3 digits)' },
      { answer: '1018', accepted: ['1018', '1018 hpa'], hint: 'Altimeter QNH' },
      { answer: '65', accepted: ['65', 'FL65', 'six five'], hint: 'Transition level' },
    ],
  },
  {
    category: 'atis',
    airportIcao: 'LFPG',
    airportName: 'Paris Charles de Gaulle',
    facility: 'ATIS 127.125',
    title: 'LFPG Paris CDG — Information Delta',
    voiceRole: 'single_broadcast',
    spokenScript:
      'Paris Charles de Gaulle arrival information Delta, time one one zero zero Zulu. Landing runways two six left and two seven right. Surface wind two four zero degrees, one five knots, gusting two two knots. Visibility eight thousand metres in light rain. Broken clouds at one thousand eight hundred feet. Temperature one two, dew point one zero. QNH one zero zero four hectopascals. Advise on initial contact you have information Delta.',
    templateText:
      'Paris CDG Arrival Information {{0}}, 11:00Z. Landing Runways {{1}} and 27R. Surface wind 240 degrees, 15 knots, gusting {{2}} knots. Visibility {{3}} metres in light rain. Broken clouds at 1,800 ft. QNH {{4}} hPa.',
    blanks: [
      { answer: 'Delta', accepted: ['D', 'delta'], hint: 'ATIS letter' },
      { answer: '26L', accepted: ['26 left', '26l', 'two six left'], hint: 'First landing runway' },
      { answer: '22', accepted: ['22', '22 kt', '22 knots'], hint: 'Wind gust speed' },
      { answer: '8000', accepted: ['8000', '8000m', '8 km'], hint: 'Visibility in metres' },
      { answer: '1004', accepted: ['1004', '1004 hpa'], hint: 'QNH pressure' },
    ],
  },
  {
    category: 'atis',
    airportIcao: 'EGLL',
    airportName: 'London Heathrow',
    facility: 'ATIS 128.075',
    title: 'EGLL London Heathrow — Information Golf',
    voiceRole: 'single_broadcast',
    spokenScript:
      'Heathrow arrival information Golf, time one four two zero Zulu. Landing runway zero niner left, departing runway zero niner right. Surface wind zero seven zero degrees, one zero knots. Visibility one zero kilometres. Scattered clouds at two thousand four hundred feet. Temperature one five, dew point zero eight. QNH one zero two three hectopascals. Acknowledge receipt of information Golf.',
    templateText:
      'Heathrow Arrival Information {{0}}, 14:20Z. Landing Runway {{1}}, departing Runway {{2}}. Surface wind 070 degrees, {{3}} knots. Scattered clouds at 2,400 ft. QNH {{4}} hPa.',
    blanks: [
      { answer: 'Golf', accepted: ['G', 'golf'], hint: 'ATIS letter' },
      { answer: '09L', accepted: ['09 left', '9L', '09l', 'nine left'], hint: 'Landing runway' },
      { answer: '09R', accepted: ['09 right', '9R', '09r', 'nine right'], hint: 'Departure runway' },
      { answer: '10', accepted: ['10', '10 kt', '10 knots'], hint: 'Wind speed' },
      { answer: '1023', accepted: ['1023', '1023 hpa'], hint: 'QNH pressure' },
    ],
  },
  {
    category: 'atis',
    airportIcao: 'LFLL',
    airportName: 'Lyon-Saint-Exupéry',
    facility: 'ATIS 126.175',
    title: 'LFLL Lyon-Saint-Exupéry — Information Kilo',
    voiceRole: 'single_broadcast',
    spokenScript:
      'Lyon Saint Exupery information Kilo, time zero six four five Zulu. Runway in use three five right for arrivals, three five left for departures. Surface wind three four zero degrees, zero eight knots. CAVOK. Temperature zero niner, dew point zero five. QNH one zero two six hectopascals. Transition level seven zero. Report information Kilo on first contact.',
    templateText:
      'Lyon-Saint-Exupéry Information {{0}}, 06:45Z. Runway in use {{1}} for arrivals, 35L for departures. Surface wind 340 degrees, 08 knots. Weather: {{2}}. QNH {{3}} hPa. Transition level {{4}}.',
    blanks: [
      { answer: 'Kilo', accepted: ['K', 'kilo'], hint: 'ATIS letter' },
      { answer: '35R', accepted: ['35 right', '35r'], hint: 'Arrival runway' },
      { answer: 'CAVOK', accepted: ['cavok', 'ceiling and visibility ok'], hint: 'Clear weather code' },
      { answer: '1026', accepted: ['1026', '1026 hpa'], hint: 'QNH pressure' },
      { answer: '70', accepted: ['70', 'FL70'], hint: 'Transition level' },
    ],
  },
  {
    category: 'atis',
    airportIcao: 'LFML',
    airportName: 'Marseille Provence',
    facility: 'ATIS 125.350',
    title: 'LFML Marseille Provence — Strong Mistral Wind',
    voiceRole: 'single_broadcast',
    spokenScript:
      'Marseille Provence information Lima, time one three one five Zulu. Runway in use three one right. Caution moderate turbulence on final approach. Surface wind three two zero degrees, two four knots, gusting three four knots. Visibility one zero kilometres, no significant cloud. Temperature one eight, dew point zero four. QNH one zero one two hectopascals.',
    templateText:
      'Marseille Provence Information {{0}}, 13:15Z. Runway in use {{1}}. Caution moderate {{2}} on final approach. Surface wind 320 degrees, 24 knots, gusting {{3}} knots. QNH {{4}} hPa.',
    blanks: [
      { answer: 'Lima', accepted: ['L', 'lima'], hint: 'ATIS letter' },
      { answer: '31R', accepted: ['31 right', '31r'], hint: 'Active runway' },
      { answer: 'turbulence', accepted: ['turbulence'], hint: 'Weather hazard on final' },
      { answer: '34', accepted: ['34', '34 kt', '34 knots'], hint: 'Maximum gust speed' },
      { answer: '1012', accepted: ['1012', '1012 hpa'], hint: 'QNH pressure' },
    ],
  },
  {
    category: 'atis',
    airportIcao: 'LFMN',
    airportName: 'Nice Côte d’Azur',
    facility: 'ATIS 129.600',
    title: 'LFMN Nice Côte d’Azur — Visual Approach 04L',
    voiceRole: 'single_broadcast',
    spokenScript:
      'Nice Cote d Azur information Oscar, time one zero zero zero Zulu. Expect Riviera visual approach runway zero four left. Departures runway zero four right. Surface wind one one zero degrees, zero six knots. Visibility one zero kilometres, few clouds at four thousand feet. Temperature two two, dew point one four. QNH one zero one niner hectopascals. Bird activity reported near threshold.',
    templateText:
      'Nice Côte d’Azur Information {{0}}, 10:00Z. Expect Riviera {{1}} approach Runway {{2}}. Surface wind 110 degrees, 06 knots. Temperature {{3}}, dew point 14. QNH {{4}} hPa. Caution: bird activity near threshold.',
    blanks: [
      { answer: 'Oscar', accepted: ['O', 'oscar'], hint: 'ATIS letter' },
      { answer: 'visual', accepted: ['visual'], hint: 'Type of approach' },
      { answer: '04L', accepted: ['04 left', '4L', '04l'], hint: 'Arrival runway' },
      { answer: '22', accepted: ['22', '22C', '22 degrees'], hint: 'Outside temperature' },
      { answer: '1019', accepted: ['1019', '1019 hpa'], hint: 'QNH pressure' },
    ],
  },
  {
    category: 'atis',
    airportIcao: 'EBBR',
    airportName: 'Brussels Airport',
    facility: 'ATIS 132.475',
    title: 'EBBR Brussels — Low Visibility Procedures',
    voiceRole: 'single_broadcast',
    spokenScript:
      'Brussels arrival information Sierra, time zero seven one zero Zulu. Low visibility procedures in force. ILS category three approach runway two five left. Runway visual range touchdown zone four hundred fifty metres. Surface wind two six zero degrees, zero five knots. Vertical visibility two hundred feet. Temperature zero four, dew point zero four. QNH one zero zero eight hectopascals.',
    templateText:
      'Brussels Information {{0}}, 07:10Z. {{1}} visibility procedures in force. ILS Category {{2}} approach Runway 25L. Touchdown RVR {{3}} metres. Vertical visibility 200 ft. QNH {{4}} hPa.',
    blanks: [
      { answer: 'Sierra', accepted: ['S', 'sierra'], hint: 'ATIS letter' },
      { answer: 'Low', accepted: ['low'], hint: 'LVP condition' },
      { answer: '3', accepted: ['3', 'III', 'three', 'cat 3', 'cat III'], hint: 'ILS Category' },
      { answer: '450', accepted: ['450', '450m'], hint: 'RVR in metres' },
      { answer: '1008', accepted: ['1008', '1008 hpa'], hint: 'QNH pressure' },
    ],
  },
  {
    category: 'atis',
    airportIcao: 'LSGG',
    airportName: 'Geneva Airport',
    facility: 'ATIS 135.575',
    title: 'LSGG Geneva — Winter Conditions & Braking Action',
    voiceRole: 'single_broadcast',
    spokenScript:
      'Geneva information Tango, time zero niner three zero Zulu. Runway in use zero four. Runway condition code five, five, five, wet. Surface wind zero five zero degrees, one one knots. Visibility six thousand metres in light snow. Overcast at one thousand five hundred feet. Temperature minus one, dew point minus two. QNH one zero one one hectopascals.',
    templateText:
      'Geneva Information {{0}}, 09:30Z. Runway in use {{1}}. Runway condition code 5-5-5, {{2}}. Visibility 6,000 metres in light {{3}}. Temperature minus 1, dew point minus 2. QNH {{4}} hPa.',
    blanks: [
      { answer: 'Tango', accepted: ['T', 'tango'], hint: 'ATIS letter' },
      { answer: '04', accepted: ['04', '4', 'zero four'], hint: 'Active runway' },
      { answer: 'wet', accepted: ['wet'], hint: 'Runway surface state' },
      { answer: 'snow', accepted: ['snow', 'light snow'], hint: 'Precipitation type' },
      { answer: '1011', accepted: ['1011', '1011 hpa'], hint: 'QNH pressure' },
    ],
  },
  {
    category: 'atis',
    airportIcao: 'EHAM',
    airportName: 'Amsterdam Schiphol',
    facility: 'ATIS 132.975',
    title: 'EHAM Amsterdam Schiphol — Dual Runway Ops',
    voiceRole: 'single_broadcast',
    spokenScript:
      'Schiphol arrival information Victor, time one six zero zero Zulu. Landing runways one eight right and one eight centre. Surface wind two zero zero degrees, one six knots. Visibility one zero kilometres, scattered clouds at two thousand eight hundred feet. Temperature one four, dew point zero seven. QNH one zero zero six hectopascals. Transition level five five.',
    templateText:
      'Schiphol Arrival Information {{0}}, 16:00Z. Landing Runways {{1}} and {{2}}. Surface wind 200 degrees, {{3}} knots. QNH {{4}} hPa. Transition level 55.',
    blanks: [
      { answer: 'Victor', accepted: ['V', 'victor'], hint: 'ATIS letter' },
      { answer: '18R', accepted: ['18 right', '18r'], hint: 'First landing runway' },
      { answer: '18C', accepted: ['18 centre', '18 center', '18c'], hint: 'Second landing runway' },
      { answer: '16', accepted: ['16', '16 kt', '16 knots'], hint: 'Wind speed' },
      { answer: '1006', accepted: ['1006', '1006 hpa'], hint: 'QNH pressure' },
    ],
  },
  {
    category: 'atis',
    airportIcao: 'LFBO',
    airportName: 'Toulouse-Blagnac',
    facility: 'ATIS 123.125',
    title: 'LFBO Toulouse-Blagnac — Information Zulu (Runway 14)',
    voiceRole: 'single_broadcast',
    spokenScript:
      'Toulouse Blagnac information Zulu, time one eight four zero Zulu. Expect ILS approach runway one four right. Departures runway one four left. Surface wind one three zero degrees, zero niner knots. Visibility one zero kilometres, few clouds at four thousand five hundred feet. Temperature two one, dew point one one. QNH one zero two one hectopascals. Taxiway Tango closed between Mike one and Mike three.',
    templateText:
      'Toulouse-Blagnac Information {{0}}, 18:40Z. Expect ILS approach Runway {{1}}. Surface wind 130 degrees, 09 knots. QNH {{2}} hPa. Taxiway {{3}} closed between {{4}} and M3.',
    blanks: [
      { answer: 'Zulu', accepted: ['Z', 'zulu'], hint: 'ATIS letter' },
      { answer: '14R', accepted: ['14 right', '14r'], hint: 'Arrival runway' },
      { answer: '1021', accepted: ['1021', '1021 hpa'], hint: 'QNH pressure' },
      { answer: 'Tango', accepted: ['T', 'tango'], hint: 'Closed taxiway' },
      { answer: 'M1', accepted: ['M1', 'Mike 1', 'Mike One'], hint: 'First closure boundary' },
    ],
  },

  // ======================== 2. AFIS (10 exercises) ========================
  {
    category: 'afis',
    airportIcao: 'LFBF',
    airportName: 'Toulouse-Francazal',
    facility: 'Francazal Info 122.405',
    title: 'LFBF Toulouse-Francazal — Initial Arrival Info',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Francazal Information, Foxtrot Golf Hotel Alpha Bravo, inbound from Albi, two thousand feet, for full stop landing. Controller: Foxtrot Alpha Bravo, Francazal Information, runway in use three zero, left hand circuit. Surface wind three one zero degrees, zero seven knots. QNH one zero one seven. One Cessna one seven two reported on downwind. Report entering downwind runway three zero.',
    templateText:
      'AFIS: F-AB, Francazal Information, Runway in use {{0}}, {{1}} circuit. Surface wind 310 degrees, 07 knots. QNH {{2}}. Traffic: one Cessna 172 on {{3}}. Report entering downwind Runway 30.',
    blanks: [
      { answer: '30', accepted: ['30', 'three zero'], hint: 'Runway in use' },
      { answer: 'left-hand', accepted: ['left', 'left hand', 'left-hand'], hint: 'Circuit direction' },
      { answer: '1017', accepted: ['1017', '1017 hpa'], hint: 'QNH pressure' },
      { answer: 'downwind', accepted: ['downwind'], hint: 'Traffic position' },
    ],
  },
  {
    category: 'afis',
    airportIcao: 'LFCR',
    airportName: 'Rodez-Aveyron',
    facility: 'Rodez Info 118.025',
    title: 'LFCR Rodez-Aveyron — Departure Traffic Advisory',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Rodez Information, Foxtrot Bravo Charlie Delta Echo, at holding point Alpha runway three one, ready for departure. Controller: Foxtrot Delta Echo, Rodez Information, no reported traffic. Surface wind three zero zero degrees, one one knots. QNH one zero two zero. Departure at your discretion runway three one, report airborne.',
    templateText:
      'AFIS: F-DE, Rodez Information, {{0}} reported traffic. Surface wind 300 degrees, {{1}} knots. QNH {{2}}. Departure at your {{3}} Runway 31, report airborne.',
    blanks: [
      { answer: 'no', accepted: ['no', 'none'], hint: 'Traffic status' },
      { answer: '11', accepted: ['11', '11 kt', '11 knots'], hint: 'Wind speed' },
      { answer: '1020', accepted: ['1020', '1020 hpa'], hint: 'QNH pressure' },
      { answer: 'discretion', accepted: ['discretion'], hint: 'AFIS responsibility word' },
    ],
  },
  {
    category: 'afis',
    airportIcao: 'LFMK',
    airportName: 'Carcassonne Salvaza',
    facility: 'Carcassonne Info 128.425',
    title: 'LFMK Carcassonne — Runway Surface & Glider Warning',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Carcassonne Information, Foxtrot Hotel Lima Mike November, ten miles east, three thousand feet, requesting aerodrome information. Controller: Foxtrot Mike November, Carcassonne Information, runway two eight in use, asphalt dry. Surface wind two seven zero degrees, one four knots. QNH one zero one five. Caution glider activity south of the airfield up to four thousand feet.',
    templateText:
      'AFIS: F-MN, Carcassonne Information, Runway {{0}} in use, asphalt dry. Surface wind 270 degrees, {{1}} knots. QNH {{2}}. Caution {{3}} activity south of the airfield up to 4,000 ft.',
    blanks: [
      { answer: '28', accepted: ['28', 'two eight'], hint: 'Active runway' },
      { answer: '14', accepted: ['14', '14 kt', '14 knots'], hint: 'Wind speed' },
      { answer: '1015', accepted: ['1015', '1015 hpa'], hint: 'QNH pressure' },
      { answer: 'glider', accepted: ['glider', 'gliders'], hint: 'Aerial activity warning' },
    ],
  },
  {
    category: 'afis',
    airportIcao: 'LFBT',
    airportName: 'Tarbes-Lourdes-Pyrénées',
    facility: 'Tarbes Info 119.050',
    title: 'LFBT Tarbes-Lourdes — Backtrack & Line-Up Information',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Tarbes Information, Foxtrot Mike Oscar Papa Quebec, taxiing for runway two zero. Controller: Foxtrot Papa Quebec, Tarbes Information, taxi via Bravo to holding point Bravo one. Backtrack on runway two zero will be required. One ATR seven two is eight miles final runway two zero. QNH one zero two four.',
    templateText:
      'AFIS: F-PQ, Tarbes Information, taxi via {{0}} to holding point B1. {{1}} on Runway 20 will be required. Traffic: one ATR-72 is {{2}} miles final. QNH {{3}}.',
    blanks: [
      { answer: 'Bravo', accepted: ['B', 'bravo'], hint: 'Taxiway letter' },
      { answer: 'Backtrack', accepted: ['backtrack'], hint: 'Runway manoeuvre' },
      { answer: '8', accepted: ['8', 'eight'], hint: 'Traffic distance in miles' },
      { answer: '1024', accepted: ['1024', '1024 hpa'], hint: 'QNH pressure' },
    ],
  },
  {
    category: 'afis',
    airportIcao: 'LFBZ',
    airportName: 'Biarritz Pays Basque',
    facility: 'Biarritz Info 118.700',
    title: 'LFBZ Biarritz — Wet Runway & Crosswind Advisory',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Biarritz Information, Golf Bravo Charlie Tango Uniform, final runway two seven. Controller: Golf Tango Uniform, Biarritz Information, runway two seven is clear, surface wet. Surface wind three two zero degrees, one six knots. Land at your discretion. Report runway vacated via Charlie.',
    templateText:
      'AFIS: G-TU, Biarritz Information, Runway {{0}} is clear, surface {{1}}. Surface wind 320 degrees, {{2}} knots. Land at your discretion. Report runway vacated via {{3}}.',
    blanks: [
      { answer: '27', accepted: ['27', 'two seven'], hint: 'Landing runway' },
      { answer: 'wet', accepted: ['wet'], hint: 'Runway surface condition' },
      { answer: '16', accepted: ['16', '16 kt', '16 knots'], hint: 'Wind speed' },
      { answer: 'Charlie', accepted: ['C', 'charlie'], hint: 'Exit taxiway' },
    ],
  },
  {
    category: 'afis',
    airportIcao: 'LFCL',
    airportName: 'Toulouse-Lasbordes',
    facility: 'Lasbordes Info 119.355',
    title: 'LFCL Toulouse-Lasbordes — Training Circuit Traffic',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Lasbordes Information, Foxtrot Golf Xray Yankee Zulu, joining overhead at two thousand feet. Controller: Foxtrot Yankee Zulu, Lasbordes Information, runway three four in use. Circuit height one thousand four hundred feet QNH one zero two two. Two aircraft in the circuit, one Robin DR four hundred turning base.',
    templateText:
      'AFIS: F-YZ, Lasbordes Information, Runway {{0}} in use. Circuit height {{1}} feet, QNH {{2}}. Two aircraft in the circuit, one Robin DR400 turning {{3}}.',
    blanks: [
      { answer: '34', accepted: ['34', 'three four'], hint: 'Active runway' },
      { answer: '1400', accepted: ['1400', '1,400'], hint: 'Circuit height in feet' },
      { answer: '1022', accepted: ['1022', '1022 hpa'], hint: 'QNH pressure' },
      { answer: 'base', accepted: ['base', 'base leg'], hint: 'Circuit leg of traffic' },
    ],
  },
  {
    category: 'afis',
    airportIcao: 'EGKA',
    airportName: 'Shoreham Brighton City',
    facility: 'Shoreham Info 123.155',
    title: 'EGKA Shoreham — Runway Inspection Vehicle on Runway',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Shoreham Information, Golf Charlie Delta Echo Foxtrot, base leg runway zero two. Controller: Golf Echo Foxtrot, Shoreham Information, runway zero two is currently occupied by an inspection vehicle, expected clear in two minutes. Surface wind zero one zero degrees, zero niner knots. Recommend go around or orbit right.',
    templateText:
      'AFIS: G-EF, Shoreham Information, Runway {{0}} is currently {{1}} by an inspection vehicle, expected clear in {{2}} minutes. Wind 010 degrees, 09 knots. Recommend go-around or orbit {{3}}.',
    blanks: [
      { answer: '02', accepted: ['02', '2', 'zero two'], hint: 'Runway number' },
      { answer: 'occupied', accepted: ['occupied'], hint: 'Runway availability word' },
      { answer: '2', accepted: ['2', 'two'], hint: 'Wait time in minutes' },
      { answer: 'right', accepted: ['right'], hint: 'Orbit direction' },
    ],
  },
  {
    category: 'afis',
    airportIcao: 'LFBA',
    airportName: 'Agen La Garenne',
    facility: 'Agen Info 118.425',
    title: 'LFBA Agen — Parachuting Activity Warning',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Agen Information, Foxtrot Hotel Juliet Kilo Lima, five minutes north, inbound for fuel stop. Controller: Foxtrot Kilo Lima, Agen Information, runway two niner in use. Surface wind two eight zero degrees, zero six knots. QNH one zero one six. Caution active parachuting west of the runway, drop zone active until one five zero zero Zulu.',
    templateText:
      'AFIS: F-KL, Agen Information, Runway {{0}} in use. Wind 280 degrees, 06 knots. QNH {{1}}. Caution active {{2}} west of the runway until {{3}}Z.',
    blanks: [
      { answer: '29', accepted: ['29', 'two niner'], hint: 'Active runway' },
      { answer: '1016', accepted: ['1016', '1016 hpa'], hint: 'QNH pressure' },
      { answer: 'parachuting', accepted: ['parachuting', 'parachute', 'skydiving'], hint: 'Aerial hazard' },
      { answer: '1500', accepted: ['1500', '15:00'], hint: 'End time UTC' },
    ],
  },
  {
    category: 'afis',
    airportIcao: 'LFLW',
    airportName: 'Aurillac',
    facility: 'Aurillac Info 119.850',
    title: 'LFLW Aurillac — IFR Arrival & Runway Lighting',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Aurillac Information, Airlinair four two one, passing five thousand feet on the RNP approach runway three three. Controller: Airlinair four two one, Aurillac Information, runway three three clear, runway lights at maximum intensity. Surface wind three four zero degrees, one zero knots. Visibility four thousand metres in mist. QNH one zero zero niner.',
    templateText:
      'AFIS: Airlinair 421, Aurillac Information, Runway {{0}} clear, runway lights at {{1}} intensity. Wind 340 degrees, 10 knots. Visibility {{2}} metres in mist. QNH {{3}}.',
    blanks: [
      { answer: '33', accepted: ['33', 'three three'], hint: 'Approach runway' },
      { answer: 'maximum', accepted: ['maximum', 'max', 'high'], hint: 'Lighting setting' },
      { answer: '4000', accepted: ['4000', '4,000', '4000m'], hint: 'Visibility in metres' },
      { answer: '1009', accepted: ['1009', '1009 hpa'], hint: 'QNH pressure' },
    ],
  },
  {
    category: 'afis',
    airportIcao: 'LFBE',
    airportName: 'Bergerac Dordogne Périgord',
    facility: 'Bergerac Info 119.200',
    title: 'LFBE Bergerac — Parking Stand & Grass Strip Closed',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Bergerac Information, Foxtrot Golf Delta Romeo Sierra, runway two seven vacated via Alpha. Controller: Foxtrot Romeo Sierra, Bergerac Information, taxi to parking stand three via Alpha and apron north. Note that the parallel grass strip is closed due to waterlogging. Report parked.',
    templateText:
      'AFIS: F-RS, Bergerac Information, taxi to parking stand {{0}} via {{1}} and apron {{2}}. Parallel {{3}} strip is closed due to waterlogging.',
    blanks: [
      { answer: '3', accepted: ['3', 'three'], hint: 'Parking stand number' },
      { answer: 'Alpha', accepted: ['A', 'alpha'], hint: 'Taxiway name' },
      { answer: 'north', accepted: ['north'], hint: 'Apron direction' },
      { answer: 'grass', accepted: ['grass'], hint: 'Closed strip surface' },
    ],
  },

  // ======================== 3. GROUND (10 exercises) ========================
  {
    category: 'ground',
    airportIcao: 'LFBO',
    airportName: 'Toulouse-Blagnac',
    facility: 'Toulouse Ground 121.905',
    title: 'LFBO Toulouse Ground — Startup & CTOT Slot',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Toulouse Ground, Air France seven five two zero, stand Charlie four, information Bravo, request start up for Paris Orly. Controller: Air France seven five two zero, Toulouse Ground, start up approved, your calculated take off time is one zero four five Zulu. QNH one zero one eight, squawk four two one five.',
    templateText:
      'Ground: Air France {{0}}, Toulouse Ground, start-up approved. Calculated take-off time (CTOT) is {{1}}Z. QNH {{2}}, squawk {{3}}.',
    blanks: [
      { answer: '7520', accepted: ['7520'], hint: 'Flight number' },
      { answer: '1045', accepted: ['1045', '10:45'], hint: 'CTOT slot time' },
      { answer: '1018', accepted: ['1018', '1018 hpa'], hint: 'QNH pressure' },
      { answer: '4215', accepted: ['4215'], hint: 'Transponder code' },
    ],
  },
  {
    category: 'ground',
    airportIcao: 'LFPG',
    airportName: 'Paris Charles de Gaulle',
    facility: 'De Gaulle Ground 121.775',
    title: 'LFPG Paris CDG — Stand Reassignment After Landing',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: De Gaulle Ground, EasyJet four three eight one, vacated runway two six left via Quebec four. Controller: EasyJet four three eight one, De Gaulle Ground, your original gate is occupied. Proceed to stand Echo two four via Quebec and Echo. Follow the marshaller on stand.',
    templateText:
      'Ground: EasyJet {{0}}, original gate is {{1}}. Proceed to stand {{2}} via Quebec and Echo. Follow the {{3}} on stand.',
    blanks: [
      { answer: '4381', accepted: ['4381'], hint: 'Flight number' },
      { answer: 'occupied', accepted: ['occupied'], hint: 'Gate status' },
      { answer: 'E24', accepted: ['E24', 'Echo 24', 'Echo two four'], hint: 'New stand' },
      { answer: 'marshaller', accepted: ['marshaller', 'marshaler'], hint: 'Ground guidance person' },
    ],
  },
  {
    category: 'ground',
    airportIcao: 'EGLL',
    airportName: 'London Heathrow',
    facility: 'Heathrow Ground 121.905',
    title: 'EGLL Heathrow Ground — Startup Delay & TSAT',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Heathrow Ground, Speedbird three zero four, stand five one two, ready for start up. Controller: Speedbird three zero four, Heathrow Ground, expect five minute delay due to departure congestion. Target start up approval time is one two one zero Zulu. Hold position and monitor this frequency.',
    templateText:
      'Ground: Speedbird {{0}}, expect {{1}}-minute delay due to departure congestion. Target start-up approval time (TSAT) is {{2}}Z. Hold position and {{3}} this frequency.',
    blanks: [
      { answer: '304', accepted: ['304'], hint: 'Callsign number' },
      { answer: '5', accepted: ['5', 'five'], hint: 'Delay duration' },
      { answer: '1210', accepted: ['1210', '12:10'], hint: 'TSAT time UTC' },
      { answer: 'monitor', accepted: ['monitor'], hint: 'Radio instruction' },
    ],
  },
  {
    category: 'ground',
    airportIcao: 'LFPO',
    airportName: 'Paris Orly',
    facility: 'Orly Ground 121.705',
    title: 'LFPO Paris Orly — IFR Clearance Revision on Ground',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Orly Ground, Transavia six two niner, stand Alpha one two, request start up. Controller: Transavia six two niner, Orly Ground, revised departure clearance: expect runway two four, LGL six Uniform departure, initial climb five thousand feet, squawk five five three zero. Read back revised clearance.',
    templateText:
      'Ground: Transavia {{0}}, revised clearance: expect Runway {{1}}, LGL {{2}} departure, initial climb {{3}} feet, squawk {{4}}.',
    blanks: [
      { answer: '629', accepted: ['629'], hint: 'Flight number' },
      { answer: '24', accepted: ['24', 'two four'], hint: 'Departure runway' },
      { answer: '6U', accepted: ['6U', '6 Uniform', 'six uniform'], hint: 'SID designator' },
      { answer: '5000', accepted: ['5000', '5,000'], hint: 'Initial climb altitude' },
      { answer: '5530', accepted: ['5530'], hint: 'Squawk code' },
    ],
  },
  {
    category: 'ground',
    airportIcao: 'EHAM',
    airportName: 'Amsterdam Schiphol',
    facility: 'Schiphol Ground 121.805',
    title: 'EHAM Schiphol Ground — De-Icing Pad Allocation',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Schiphol Ground, KLM one two three four, gate Delta four two, requesting de icing before departure. Controller: KLM one two three four, Schiphol Ground, de icing approved at pad Juliet. When ready to push, contact apron control on one two one decimal six five zero.',
    templateText:
      'Ground: KLM {{0}}, de-icing approved at pad {{1}}. When ready to push, contact {{2}} control on {{3}}.',
    blanks: [
      { answer: '1234', accepted: ['1234'], hint: 'Flight number' },
      { answer: 'Juliet', accepted: ['J', 'juliet', 'juliett'], hint: 'De-icing pad letter' },
      { answer: 'apron', accepted: ['apron'], hint: 'Next ground unit' },
      { answer: '121.650', accepted: ['121.650', '121.65'], hint: 'VHF frequency' },
    ],
  },
  {
    category: 'ground',
    airportIcao: 'LFBO',
    airportName: 'Toulouse-Blagnac',
    facility: 'Toulouse Ground 121.905',
    title: 'LFBO Toulouse Ground — Airbus Flight Test Apron Transfer',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Toulouse Ground, Airbus zero four Echo, on delivery apron, request start up for local test flight. Controller: Airbus zero four Echo, Toulouse Ground, start up approved, expect runway three two left. QNH one zero two one, squawk seven zero four two. Call ready for taxi.',
    templateText:
      'Ground: Airbus {{0}}, start-up approved, expect Runway {{1}}. QNH {{2}}, squawk {{3}}. Call ready for taxi.',
    blanks: [
      { answer: '04E', accepted: ['04E', '04 Echo', 'zero four echo'], hint: 'Test callsign' },
      { answer: '32L', accepted: ['32L', '32 left'], hint: 'Expected runway' },
      { answer: '1021', accepted: ['1021', '1021 hpa'], hint: 'QNH pressure' },
      { answer: '7042', accepted: ['7042'], hint: 'Squawk code' },
    ],
  },
  {
    category: 'ground',
    airportIcao: 'LSZH',
    airportName: 'Zurich Airport',
    facility: 'Zurich Ground 121.905',
    title: 'LSZH Zurich Ground — Frequency Transfer to Tower',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Zurich Ground, Swiss one six eight, approaching holding point Echo three runway two eight. Controller: Swiss one six eight, Zurich Ground, hold short of runway two eight at Echo three and monitor Zurich Tower on one one eight decimal one zero zero.',
    templateText:
      'Ground: Swiss {{0}}, hold short of Runway {{1}} at {{2}} and monitor Zurich Tower on {{3}}.',
    blanks: [
      { answer: '168', accepted: ['168'], hint: 'Flight number' },
      { answer: '28', accepted: ['28', 'two eight'], hint: 'Runway number' },
      { answer: 'E3', accepted: ['E3', 'Echo 3', 'Echo three'], hint: 'Holding point' },
      { answer: '118.100', accepted: ['118.100', '118.1'], hint: 'Tower frequency' },
    ],
  },
  {
    category: 'ground',
    airportIcao: 'LFLL',
    airportName: 'Lyon-Saint-Exupéry',
    facility: 'Lyon Ground 121.855',
    title: 'LFLL Lyon Ground — Auxiliary Power Unit & Ground Power Note',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Lyon Ground, Hop five zero eight, stand Bravo one one, requesting remote start up due to inoperative APU. Controller: Hop five zero eight, Lyon Ground, engine number two start on stand approved. Advise when ground crew is disconnected and ready for pushback.',
    templateText:
      'Ground: Hop {{0}}, engine number {{1}} start on stand approved. Advise when ground crew is {{2}} and ready for {{3}}.',
    blanks: [
      { answer: '508', accepted: ['508'], hint: 'Flight number' },
      { answer: '2', accepted: ['2', 'two'], hint: 'Engine number' },
      { answer: 'disconnected', accepted: ['disconnected', 'clear'], hint: 'Ground crew status' },
      { answer: 'pushback', accepted: ['pushback', 'push back'], hint: 'Next manoeuvre' },
    ],
  },
  {
    category: 'ground',
    airportIcao: 'EBBR',
    airportName: 'Brussels Airport',
    facility: 'Brussels Ground 121.880',
    title: 'EBBR Brussels Ground — Tow Aircraft Crossing Apron',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Brussels Ground, Brussels Airlines two seven one, stand Alpha five zero, ready for start up. Controller: Brussels Airlines two seven one, Brussels Ground, start up approved, stand by for pushback due to a towed Boeing seven seven seven passing behind your stand.',
    templateText:
      'Ground: Brussels Airlines {{0}}, start-up approved, {{1}} for pushback due to a towed Boeing {{2}} passing {{3}} your stand.',
    blanks: [
      { answer: '271', accepted: ['271'], hint: 'Flight number' },
      { answer: 'stand by', accepted: ['stand by', 'standby'], hint: 'Wait instruction' },
      { answer: '777', accepted: ['777'], hint: 'Aircraft type' },
      { answer: 'behind', accepted: ['behind'], hint: 'Relative position' },
    ],
  },
  {
    category: 'ground',
    airportIcao: 'LEMD',
    airportName: 'Madrid Barajas',
    facility: 'Madrid Ground 121.855',
    title: 'LEMD Madrid Ground — Terminal 4 Apron Handover',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Madrid Ground, Iberia three four one two, vacated runway three two left at Lima five. Controller: Iberia three four one two, Madrid Ground, taxi via Mike and November to entry point Victor two, then contact Terminal Four apron on one two three decimal zero zero five.',
    templateText:
      'Ground: Iberia {{0}}, taxi via {{1}} and November to entry point {{2}}, then contact Terminal 4 apron on {{3}}.',
    blanks: [
      { answer: '3412', accepted: ['3412'], hint: 'Flight number' },
      { answer: 'Mike', accepted: ['M', 'mike'], hint: 'First taxiway' },
      { answer: 'V2', accepted: ['V2', 'Victor 2', 'Victor two'], hint: 'Apron entry point' },
      { answer: '123.005', accepted: ['123.005'], hint: 'Apron frequency' },
    ],
  },

  // ======================== 4. PUSHBACK (10 exercises) ========================
  {
    category: 'pushback',
    airportIcao: 'LFBO',
    airportName: 'Toulouse-Blagnac',
    facility: 'Toulouse Ground 121.905',
    title: 'LFBO Toulouse — Pushback Facing North',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Toulouse Ground, Air France seven five two zero, stand Charlie four, fully ready for pushback. Controller: Air France seven five two zero, pushback and start up approved, facing north on taxilane Echo. Report ready for taxi.',
    templateText:
      'Ground: Air France {{0}}, pushback and start-up approved, facing {{1}} on taxilane {{2}}. Report ready for {{3}}.',
    blanks: [
      { answer: '7520', accepted: ['7520'], hint: 'Flight number' },
      { answer: 'north', accepted: ['north'], hint: 'Nose direction' },
      { answer: 'Echo', accepted: ['E', 'echo'], hint: 'Taxilane letter' },
      { answer: 'taxi', accepted: ['taxi'], hint: 'Next report' },
    ],
  },
  {
    category: 'pushback',
    airportIcao: 'LFPG',
    airportName: 'Paris Charles de Gaulle',
    facility: 'De Gaulle Apron 121.930',
    title: 'LFPG Paris CDG — Long Pushback to Release Point',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: De Gaulle Apron, Air France one one eight zero, gate Foxtrot three two, requesting push and start. Controller: Air France one one eight zero, pushback approved to release point Romeo four, tail west. Start engines after tug disconnection.',
    templateText:
      'Apron: Air France {{0}}, pushback approved to release point {{1}}, tail {{2}}. Start engines after {{3}} disconnection.',
    blanks: [
      { answer: '1180', accepted: ['1180'], hint: 'Flight number' },
      { answer: 'R4', accepted: ['R4', 'Romeo 4', 'Romeo four'], hint: 'Release point' },
      { answer: 'west', accepted: ['west'], hint: 'Tail direction' },
      { answer: 'tug', accepted: ['tug', 'tractor'], hint: 'Ground vehicle' },
    ],
  },
  {
    category: 'pushback',
    airportIcao: 'EGLL',
    airportName: 'London Heathrow',
    facility: 'Heathrow Ground 121.905',
    title: 'EGLL Heathrow — Pushback Facing East, Keep Clear of Cul-de-Sac',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Heathrow Ground, Speedbird niner two four, stand five zero eight, ready for pushback. Controller: Speedbird niner two four, push and start approved, facing east. Push to abeam stand five zero six and keep clear of taxiway Alpha.',
    templateText:
      'Ground: Speedbird {{0}}, push and start approved, facing {{1}}. Push to abeam stand {{2}} and keep clear of taxiway {{3}}.',
    blanks: [
      { answer: '924', accepted: ['924'], hint: 'Flight number' },
      { answer: 'east', accepted: ['east'], hint: 'Nose heading' },
      { answer: '506', accepted: ['506'], hint: 'Abeam stand number' },
      { answer: 'Alpha', accepted: ['A', 'alpha'], hint: 'Taxiway to keep clear of' },
    ],
  },
  {
    category: 'pushback',
    airportIcao: 'LFML',
    airportName: 'Marseille Provence',
    facility: 'Marseille Ground 121.755',
    title: 'LFML Marseille — Short Pushback with Traffic Behind',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Marseille Ground, Volotea two eight one zero, stand one four, requesting pushback. Controller: Volotea two eight one zero, pushback approved, facing south. Caution a Ryanair seven three seven taxiing behind you from left to right, wait until it passes before starting push.',
    templateText:
      'Ground: Volotea {{0}}, pushback approved, facing {{1}}. Caution a Ryanair {{2}} taxiing behind you from {{3}} to right.',
    blanks: [
      { answer: '2810', accepted: ['2810'], hint: 'Flight number' },
      { answer: 'south', accepted: ['south'], hint: 'Nose direction' },
      { answer: '737', accepted: ['737'], hint: 'Aircraft model' },
      { answer: 'left', accepted: ['left'], hint: 'Traffic origin side' },
    ],
  },
  {
    category: 'pushback',
    airportIcao: 'EDDF',
    airportName: 'Frankfurt Airport',
    facility: 'Frankfurt Apron 121.855',
    title: 'EDDF Frankfurt — Pushback onto Blue Line',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Frankfurt Apron, Lufthansa four zero two, gate Alpha two six, ready for pushback and start up. Controller: Lufthansa four zero two, pushback approved onto the blue line, nose west. Start up at pilot discretion once clear of the gate.',
    templateText:
      'Apron: Lufthansa {{0}}, pushback approved onto the {{1}} line, nose {{2}}. Start-up at pilot {{3}} once clear of the gate.',
    blanks: [
      { answer: '402', accepted: ['402'], hint: 'Flight number' },
      { answer: 'blue', accepted: ['blue'], hint: 'Taxilane color' },
      { answer: 'west', accepted: ['west'], hint: 'Nose direction' },
      { answer: 'discretion', accepted: ['discretion'], hint: 'Start-up authority' },
    ],
  },
  {
    category: 'pushback',
    airportIcao: 'LFBO',
    airportName: 'Toulouse-Blagnac',
    facility: 'Toulouse Ground 121.905',
    title: 'LFBO Toulouse — Hold Pushback for Inbound Aircraft',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Toulouse Ground, EasyJet one six four two, stand Delta two, ready to push. Controller: EasyJet one six four two, hold position, stand by for pushback. An Air France A three twenty is turning into stand Delta four on your right. Expect pushback in two minutes.',
    templateText:
      'Ground: EasyJet {{0}}, {{1}} position, stand by for pushback. An Air France A320 is turning into stand {{2}} on your right. Expect pushback in {{3}} minutes.',
    blanks: [
      { answer: '1642', accepted: ['1642'], hint: 'Flight number' },
      { answer: 'hold', accepted: ['hold'], hint: 'Immediate stop instruction' },
      { answer: 'D4', accepted: ['D4', 'Delta 4', 'Delta four'], hint: 'Adjacent stand' },
      { answer: '2', accepted: ['2', 'two'], hint: 'Expected wait' },
    ],
  },
  {
    category: 'pushback',
    airportIcao: 'LFMN',
    airportName: 'Nice Côte d’Azur',
    facility: 'Nice Ground 121.705',
    title: 'LFMN Nice — Pushback & Pull Forward to Taxi Line',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Nice Ground, Air France seven seven zero five, stand four two Alpha, request push and start. Controller: Air France seven seven zero five, pushback approved, tail north, then pull forward to stop bar four zero before starting engines.',
    templateText:
      'Ground: Air France {{0}}, pushback approved, tail {{1}}, then pull {{2}} to stop bar {{3}} before starting engines.',
    blanks: [
      { answer: '7705', accepted: ['7705'], hint: 'Flight number' },
      { answer: 'north', accepted: ['north'], hint: 'Tail direction' },
      { answer: 'forward', accepted: ['forward'], hint: 'Tug manoeuvre' },
      { answer: '40', accepted: ['40', 'four zero'], hint: 'Stop bar number' },
    ],
  },
  {
    category: 'pushback',
    airportIcao: 'EHAM',
    airportName: 'Amsterdam Schiphol',
    facility: 'Schiphol Ground 121.805',
    title: 'EHAM Schiphol — Simultaneous Pushback Warning',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Schiphol Ground, KLM one zero zero niner, gate Charlie one two, ready for pushback. Controller: KLM one zero zero niner, push and start approved facing south. Be advised a Lufthansa A three nineteen is pushing simultaneously from gate Charlie one six.',
    templateText:
      'Ground: KLM {{0}}, push and start approved facing {{1}}. A Lufthansa {{2}} is pushing simultaneously from gate {{3}}.',
    blanks: [
      { answer: '1009', accepted: ['1009'], hint: 'Flight number' },
      { answer: 'south', accepted: ['south'], hint: 'Nose heading' },
      { answer: 'A319', accepted: ['A319', '319', 'A 319'], hint: 'Aircraft type' },
      { answer: 'C16', accepted: ['C16', 'Charlie 16', 'Charlie one six'], hint: 'Other gate' },
    ],
  },
  {
    category: 'pushback',
    airportIcao: 'LSGG',
    airportName: 'Geneva Airport',
    facility: 'Geneva Ground 121.675',
    title: 'LSGG Geneva — Pushback Interrupted for Brake Check',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Geneva Ground, EasyJet eight four one five, stand three, ready for pushback. Controller: EasyJet eight four one five, pushback approved facing northeast onto taxilane Inner. Confirm parking brake released with ground crew and advise if you need a tow bar disconnection point.',
    templateText:
      'Ground: EasyJet {{0}}, pushback approved facing {{1}} onto taxilane {{2}}. Confirm parking brake {{3}} with ground crew.',
    blanks: [
      { answer: '8415', accepted: ['8415'], hint: 'Flight number' },
      { answer: 'northeast', accepted: ['northeast', 'north east', 'north-east'], hint: 'Nose heading' },
      { answer: 'Inner', accepted: ['inner'], hint: 'Taxilane name' },
      { answer: 'released', accepted: ['released'], hint: 'Brake state' },
    ],
  },
  {
    category: 'pushback',
    airportIcao: 'EBBR',
    airportName: 'Brussels Airport',
    facility: 'Brussels Ground 121.880',
    title: 'EBBR Brussels — Pushback Facing West on Outer',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Brussels Ground, Ryanair five one two three, stand one four two, ready to push and start. Controller: Ryanair five one two three, push and start approved, facing west on Outer one. Expect runway two five right for departure.',
    templateText:
      'Ground: Ryanair {{0}}, push and start approved, facing {{1}} on {{2}} 1. Expect Runway {{3}} for departure.',
    blanks: [
      { answer: '5123', accepted: ['5123'], hint: 'Flight number' },
      { answer: 'west', accepted: ['west'], hint: 'Nose heading' },
      { answer: 'Outer', accepted: ['outer'], hint: 'Taxilane name' },
      { answer: '25R', accepted: ['25R', '25 right'], hint: 'Departure runway' },
    ],
  },

  // ======================== 5. TAXIWAY MOVEMENTS (10 exercises) ========================
  {
    category: 'taxiway',
    airportIcao: 'LFBO',
    airportName: 'Toulouse-Blagnac',
    facility: 'Toulouse Ground 121.905',
    title: 'LFBO Toulouse — Taxi to Holding Point M1',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Toulouse Ground, Air France seven five two zero, ready for taxi. Controller: Air France seven five two zero, taxi to holding point Mike one runway three two right via Echo, Papa, and Mike. Hold short of runway three two right.',
    templateText:
      'Ground: Air France 7520, taxi to holding point {{0}} Runway {{1}} via {{2}}, Papa, and {{3}}. Hold short of Runway 32R.',
    blanks: [
      { answer: 'M1', accepted: ['M1', 'Mike 1', 'Mike one'], hint: 'Holding point' },
      { answer: '32R', accepted: ['32R', '32 right'], hint: 'Runway designator' },
      { answer: 'Echo', accepted: ['E', 'echo'], hint: 'First taxiway' },
      { answer: 'Mike', accepted: ['M', 'mike'], hint: 'Final taxiway' },
    ],
  },
  {
    category: 'taxiway',
    airportIcao: 'LFPG',
    airportName: 'Paris Charles de Gaulle',
    facility: 'De Gaulle Ground 121.775',
    title: 'LFPG Paris CDG — Give Way & Cross Runway',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: De Gaulle Ground, Lufthansa one zero three zero, approaching taxiway Bravo. Controller: Lufthansa one zero three zero, give way to the Air France Boeing seven eight seven crossing from your right, then continue via Bravo and hold short of runway two six right at Bravo four.',
    templateText:
      'Ground: Lufthansa 1030, {{0}} to the Air France Boeing {{1}} crossing from your {{2}}, then continue via Bravo and hold short of Runway 26R at {{3}}.',
    blanks: [
      { answer: 'give way', accepted: ['give way'], hint: 'Priority instruction' },
      { answer: '787', accepted: ['787'], hint: 'Aircraft type' },
      { answer: 'right', accepted: ['right'], hint: 'Traffic direction' },
      { answer: 'B4', accepted: ['B4', 'Bravo 4', 'Bravo four'], hint: 'Holding point' },
    ],
  },
  {
    category: 'taxiway',
    airportIcao: 'EGLL',
    airportName: 'London Heathrow',
    facility: 'Heathrow Ground 121.905',
    title: 'EGLL Heathrow — Conditional Taxi & Hold at Block',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Heathrow Ground, Speedbird three zero four, ready to taxi from stand five one two. Controller: Speedbird three zero four, taxi via Alpha and Link two five, hold at Block six seven. Follow the Virgin Airbus A three fifty on your left.',
    templateText:
      'Ground: Speedbird 304, taxi via {{0}} and Link {{1}}, hold at Block {{2}}. Follow the Virgin {{3}} on your left.',
    blanks: [
      { answer: 'Alpha', accepted: ['A', 'alpha'], hint: 'Main taxiway' },
      { answer: '25', accepted: ['25', 'two five'], hint: 'Link number' },
      { answer: '67', accepted: ['67', 'six seven'], hint: 'Block holding point' },
      { answer: 'A350', accepted: ['A350', '350', 'Airbus A350'], hint: 'Aircraft to follow' },
    ],
  },
  {
    category: 'taxiway',
    airportIcao: 'LFBO',
    airportName: 'Toulouse-Blagnac',
    facility: 'Toulouse Tower 118.100',
    title: 'LFBO Toulouse — Crossing Runway 32R After Landing 32L',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Toulouse Tower, EasyJet four two one zero, vacated runway three two left at Sierra three, holding short of runway three two right. Controller: EasyJet four two one zero, cross runway three two right at Sierra three, then contact Toulouse Ground on one two one decimal niner zero five.',
    templateText:
      'Tower: EasyJet 4210, {{0}} Runway {{1}} at {{2}}, then contact Toulouse Ground on {{3}}.',
    blanks: [
      { answer: 'cross', accepted: ['cross'], hint: 'Runway clearance verb' },
      { answer: '32R', accepted: ['32R', '32 right'], hint: 'Runway to cross' },
      { answer: 'S3', accepted: ['S3', 'Sierra 3', 'Sierra three'], hint: 'Crossing intersection' },
      { answer: '121.905', accepted: ['121.905'], hint: 'Ground frequency' },
    ],
  },
  {
    category: 'taxiway',
    airportIcao: 'LFLL',
    airportName: 'Lyon-Saint-Exupéry',
    facility: 'Lyon Ground 121.855',
    title: 'LFLL Lyon — Intersection Departure Taxi',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Lyon Ground, Hop five zero eight, ready for taxi, able intersection departure runway three five left. Controller: Hop five zero eight, taxi to holding point Delta two runway three five left via Charlie and Delta. Take off run available is two thousand two hundred metres.',
    templateText:
      'Ground: Hop 508, taxi to holding point {{0}} Runway {{1}} via {{2}} and Delta. Take-off run available (TORA) is {{3}} metres.',
    blanks: [
      { answer: 'D2', accepted: ['D2', 'Delta 2', 'Delta two'], hint: 'Intersection holding point' },
      { answer: '35L', accepted: ['35L', '35 left'], hint: 'Departure runway' },
      { answer: 'Charlie', accepted: ['C', 'charlie'], hint: 'First taxiway' },
      { answer: '2200', accepted: ['2200', '2,200'], hint: 'TORA in metres' },
    ],
  },
  {
    category: 'taxiway',
    airportIcao: 'EHAM',
    airportName: 'Amsterdam Schiphol',
    facility: 'Schiphol Ground 121.805',
    title: 'EHAM Schiphol — Standard Taxi to Polderbaan 36L',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Schiphol Ground, KLM one two three four, ready to taxi. Controller: KLM one two three four, taxi to holding point Victor four runway three six left via Quebec, Zulu, and Victor. Cross bridge Victor and hold short of runway three six left.',
    templateText:
      'Ground: KLM 1234, taxi to holding point {{0}} Runway {{1}} via {{2}}, Zulu, and Victor. Cross {{3}} Victor and hold short of Runway 36L.',
    blanks: [
      { answer: 'V4', accepted: ['V4', 'Victor 4', 'Victor four'], hint: 'Holding point' },
      { answer: '36L', accepted: ['36L', '36 left'], hint: 'Departure runway' },
      { answer: 'Quebec', accepted: ['Q', 'quebec'], hint: 'First taxiway' },
      { answer: 'bridge', accepted: ['bridge'], hint: 'Taxiway overpass structure' },
    ],
  },
  {
    category: 'taxiway',
    airportIcao: 'LSGG',
    airportName: 'Geneva Airport',
    facility: 'Geneva Ground 121.675',
    title: 'LSGG Geneva — Expedite Vacating & Turn Left',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Geneva Ground, Swiss two one four, vacating runway zero four via Foxtrot. Controller: Swiss two one four, expedite vacating due to traffic on two mile final, turn left onto Inner, and hold short of taxiway Charlie.',
    templateText:
      'Ground: Swiss 214, {{0}} vacating due to traffic on {{1}}-mile final, turn {{2}} onto Inner, and hold short of taxiway {{3}}.',
    blanks: [
      { answer: 'expedite', accepted: ['expedite'], hint: 'Speed-up instruction' },
      { answer: '2', accepted: ['2', 'two'], hint: 'Final distance' },
      { answer: 'left', accepted: ['left'], hint: 'Turn direction' },
      { answer: 'Charlie', accepted: ['C', 'charlie'], hint: 'Taxiway to hold short of' },
    ],
  },
  {
    category: 'taxiway',
    airportIcao: 'LFPO',
    airportName: 'Paris Orly',
    facility: 'Orly Ground 121.705',
    title: 'LFPO Paris Orly — Taxiway Closure Reroute',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Orly Ground, Transavia six two niner, ready for taxi from stand Alpha one two. Controller: Transavia six two niner, taxiway Whiskey three is closed for maintenance. Taxi via Whiskey two, Lima, and Whiskey four to holding point Whiskey four runway two four.',
    templateText:
      'Ground: Transavia 629, taxiway {{0}} is closed for maintenance. Taxi via {{1}}, {{2}}, and W4 to holding point W4 Runway {{3}}.',
    blanks: [
      { answer: 'W3', accepted: ['W3', 'Whiskey 3', 'Whiskey three'], hint: 'Closed taxiway' },
      { answer: 'W2', accepted: ['W2', 'Whiskey 2', 'Whiskey two'], hint: 'First alternate taxiway' },
      { answer: 'Lima', accepted: ['L', 'lima'], hint: 'Connecting taxiway' },
      { answer: '24', accepted: ['24', 'two four'], hint: 'Runway number' },
    ],
  },
  {
    category: 'taxiway',
    airportIcao: 'EBBR',
    airportName: 'Brussels Airport',
    facility: 'Brussels Ground 121.880',
    title: 'EBBR Brussels — Progressive Taxi in Low Visibility',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Brussels Ground, Brussels Airlines two seven one, requesting progressive taxi in fog. Controller: Brussels Airlines two seven one, follow the green centreline lights straight ahead on Outer eight, take the next right turn onto Charlie two, and stop at the illuminated red stop bar.',
    templateText:
      'Ground: Brussels Airlines 271, follow the {{0}} centreline lights on Outer {{1}}, take the next {{2}} turn onto C2, and stop at the red {{3}}.',
    blanks: [
      { answer: 'green', accepted: ['green'], hint: 'Taxiway light color' },
      { answer: '8', accepted: ['8', 'eight'], hint: 'Outer taxilane number' },
      { answer: 'right', accepted: ['right'], hint: 'Turn direction' },
      { answer: 'stop bar', accepted: ['stop bar', 'stopbar'], hint: 'Red runway guard lights' },
    ],
  },
  {
    category: 'taxiway',
    airportIcao: 'LFMN',
    airportName: 'Nice Côte d’Azur',
    facility: 'Nice Ground 121.705',
    title: 'LFMN Nice — High-Speed Exit & Hold Before Crossing 04R',
    voiceRole: 'atc_pilot_exchange',
    spokenScript:
      'Pilot: Nice Ground, Air France seven seven zero five, vacated runway zero four left at Uniform four. Controller: Air France seven seven zero five, continue on Uniform, hold short of runway zero four right at Uniform six. Do not cross without Tower clearance.',
    templateText:
      'Ground: Air France 7705, continue on {{0}}, hold short of Runway {{1}} at {{2}}. Do not {{3}} without Tower clearance.',
    blanks: [
      { answer: 'Uniform', accepted: ['U', 'uniform'], hint: 'Taxiway name' },
      { answer: '04R', accepted: ['04R', '4R', '04 right'], hint: 'Runway to hold short of' },
      { answer: 'U6', accepted: ['U6', 'Uniform 6', 'Uniform six'], hint: 'Holding point' },
      { answer: 'cross', accepted: ['cross'], hint: 'Prohibited action without clearance' },
    ],
  },
];

export const CATEGORY_META: Record<
  GapFillCategory,
  { label: string; shortLabel: string; description: string }
> = {
  atis: {
    label: 'ATIS Broadcasts',
    shortLabel: 'ATIS',
    description: 'Automatic Terminal Information Service: runway, wind, visibility, clouds, QNH, and transition level.',
  },
  afis: {
    label: 'AFIS Information',
    shortLabel: 'AFIS',
    description: 'Aerodrome Flight Information Service: traffic advisories, circuit info, runway conditions, and pilot discretion.',
  },
  clearance: {
    label: 'Route Clearance',
    shortLabel: 'Route Clearance',
    description: 'IFR delivery clearances: destination, SID departures, initial climb levels, squawk codes, CTOT slots, and departure frequencies.',
  },
  ground: {
    label: 'Ground Control',
    shortLabel: 'Ground',
    description: 'Start-up approvals, CTOT/TSAT slots, squawk codes, stand changes, de-icing, and frequency transfers.',
  },
  pushback: {
    label: 'Pushback Clearances',
    shortLabel: 'Pushback',
    description: 'Nose/tail directions, release points, tug disconnections, and traffic behind stands.',
  },
  taxiway: {
    label: 'Taxiway Movements',
    shortLabel: 'Taxiway',
    description: 'Taxi routes, holding points, runway crossings, give-way instructions, and low-visibility stop bars.',
  },
};

const CATEGORY_ORDER: GapFillCategory[] = [
  'atis',
  'afis',
  'clearance',
  'ground',
  'pushback',
  'taxiway',
];

export function createSeedGapFillExercises(): GapFillExercise[] {
  const combined = [...RAW_EXERCISES, ...EXTENDED_GAP_EXERCISES];
  const counters: Record<GapFillCategory, number> = {
    atis: 0,
    afis: 0,
    clearance: 0,
    ground: 0,
    pushback: 0,
    taxiway: 0,
  };

  const ordered = CATEGORY_ORDER.flatMap((cat) => combined.filter((ex) => ex.category === cat));

  return ordered.map((raw) => {
    counters[raw.category] += 1;
    const idx = counters[raw.category];
    const id = `gap_${raw.category}_${String(idx).padStart(2, '0')}`;
    const blanks: GapBlank[] = raw.blanks.map((b, bIdx) => ({
      id: `${id}_b${bIdx}`,
      answer: b.answer,
      acceptedAnswers: b.accepted && b.accepted.length > 0 ? b.accepted : [b.answer],
      hint: b.hint,
    }));

    return {
      id,
      category: raw.category,
      indexInCategory: idx,
      airportIcao: raw.airportIcao,
      airportName: raw.airportName,
      facility: raw.facility,
      title: raw.title,
      instructions:
        'Listen to the European/ICAO VHF radio clip and fill in each missing operational detail. Then click Check My Answers to see how you did.',
      spokenScript: raw.spokenScript,
      templateText: raw.templateText,
      blanks,
      voiceRole: raw.voiceRole,
      audioFilename: `${id}_${raw.airportIcao}.wav`,
      hasLocalAudio: false,
      fileSizeBytes: 0,
      audioStatus: 'unprepared',
    };
  });
}
