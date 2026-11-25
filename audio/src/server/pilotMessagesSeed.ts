import type { GapBlank, PilotMessageExercise, PilotVocabItem } from '../types/hub.ts';

interface RawPilotMessage {
  messageType: 'routine' | 'non_routine';
  callsign: string;
  sector: string;
  frequencyMHz: string;
  title: string;
  spokenScript: string;
  templateText: string;
  blanks: Array<{
    answer: string;
    accepted?: string[];
    hint: string;
  }>;
  phaseOfFlight: string;
  contextSummary: string;
  usefulVocabulary: PilotVocabItem[];
  voiceName: PilotMessageExercise['voiceName'];
}

const RAW_PILOT_MESSAGES: RawPilotMessage[] = [
  // ======================== ROUTINE & NON-ROUTINE PILOT MESSAGES (30 exercises, 3 gaps each) ========================
  {
    messageType: 'non_routine',
    callsign: 'Air France 6124',
    sector: 'Bordeaux Control',
    frequencyMHz: '125.105',
    title: 'Sick Passenger — Medical Priority Diversion',
    spokenScript:
      'Bordeaux Control, one two five decimal one zero five, PAN PAN, PAN PAN, PAN PAN, Air France six one two four, passing flight level two four zero. We have a sick passenger on board with severe chest pain. Requesting priority diversion to Toulouse Blagnac and medical assistance on arrival.',
    templateText:
      'PAN PAN, Air France 6124 on 125.105 MHz, passing {{0}}. We have a {{1}} on board with severe chest pain, requesting priority diversion to {{2}} and medical assistance on arrival.',
    blanks: [
      { answer: 'FL240', accepted: ['FL240', '240', 'FL 240', 'flight level 240'], hint: 'Current flight level' },
      { answer: 'sick passenger', accepted: ['sick passenger', 'ill passenger', 'passenger'], hint: 'Medical situation' },
      { answer: 'Toulouse-Blagnac', accepted: ['Toulouse-Blagnac', 'Toulouse', 'LFBO', 'Toulouse Blagnac'], hint: 'Diversion airport' },
    ],
    phaseOfFlight: 'En-Route Climb / Cruise Diversion',
    contextSummary:
      'The crew declares an urgency condition (PAN PAN) because a passenger has suspected cardiac symptoms. They inform Bordeaux Control of their current passing level and ask for direct priority routing to Toulouse with paramedics ready at the gate.',
    usefulVocabulary: [
      { term: 'PAN PAN', meaning: 'International radio urgency call indicating an urgent situation that does not yet require immediate life-or-death distress (MAYDAY).' },
      { term: 'Priority diversion', meaning: 'Changing destination to a closer airport with expedited ATC handling.' },
      { term: 'Medical assistance on arrival', meaning: 'Requesting airport doctors or paramedics to meet the aircraft on stand.' },
    ],
    voiceName: 'Puck',
  },
  {
    messageType: 'routine',
    callsign: 'EasyJet 4082',
    sector: 'Bordeaux Control',
    frequencyMHz: '125.105',
    title: 'Passing FL240 — Requesting Direct Waypoint',
    spokenScript:
      'Bordeaux Control, good morning, EasyJet four zero eight two on one two five decimal one zero five, passing flight level two four zero climbing flight level three four zero, requesting direct to AGENA.',
    templateText:
      'EasyJet 4082 checking in on 125.105 MHz, passing {{0}}, climbing to {{1}}, requesting direct to {{2}}.',
    blanks: [
      { answer: 'FL240', accepted: ['FL240', '240', 'FL 240', 'flight level 240'], hint: 'Passing flight level' },
      { answer: 'FL340', accepted: ['FL340', '340', 'FL 340', 'flight level 340'], hint: 'Cleared climb level' },
      { answer: 'AGENA', accepted: ['AGENA', 'Agena'], hint: 'Requested waypoint' },
    ],
    phaseOfFlight: 'En-Route Climb',
    contextSummary:
      'Standard initial check-in with an en-route area control sector after frequency transfer. The pilot reports the current passing level, target cleared level, and asks for a shortcut directly to a downstream waypoint.',
    usefulVocabulary: [
      { term: 'Passing FL240', meaning: 'Crossing 24,000 feet on standard pressure (1013 hPa) while still climbing or descending.' },
      { term: 'Direct to [waypoint]', meaning: 'Requesting a straight-line shortcut to a navigation fix to save flight time and fuel.' },
      { term: 'Climbing flight level...', meaning: 'Confirming the aircraft’s cleared target flight level during initial check-in.' },
    ],
    voiceName: 'Fenrir',
  },
  {
    messageType: 'non_routine',
    callsign: 'Lufthansa 1094',
    sector: 'Marseille Control',
    frequencyMHz: '133.055',
    title: 'Weather Deviation Around CB Build-Ups',
    spokenScript:
      'Marseille Control, Lufthansa one zero niner four, maintaining flight level three six zero. Due to heavy thunderstorm cells ahead, requesting deviation twenty miles left of track.',
    templateText:
      'Lufthansa 1094 maintaining {{0}}. Due to heavy {{1}} cells ahead, requesting deviation {{2}} miles left of track.',
    blanks: [
      { answer: 'FL360', accepted: ['FL360', '360', 'FL 360', 'flight level 360'], hint: 'Cruise flight level' },
      { answer: 'thunderstorm', accepted: ['thunderstorm', 'thunderstorms', 'CB', 'storm'], hint: 'Weather hazard' },
      { answer: '20', accepted: ['20', 'twenty', '20 miles', '20 NM'], hint: 'Deviation distance' },
    ],
    phaseOfFlight: 'Cruise',
    contextSummary:
      'While cruising over southern France, the crew detects convective storm cells on weather radar and asks Marseille Control for lateral clearance to steer 20 nautical miles left of the airway centerline.',
    usefulVocabulary: [
      { term: 'Deviation left of track', meaning: 'Temporarily flying off the assigned airway course to avoid hazardous weather.' },
      { term: 'Thunderstorm cells / CB', meaning: 'Cumulonimbus convective storm clouds containing severe turbulence, hail, and lightning.' },
      { term: 'Maintaining FL360', meaning: 'Flying level at 36,000 feet on standard pressure.' },
    ],
    voiceName: 'Charon',
  },
  {
    messageType: 'routine',
    callsign: 'Speedbird 306',
    sector: 'Paris Control',
    frequencyMHz: '128.100',
    title: 'Requesting Higher Level for Smooth Air',
    spokenScript:
      'Paris Control, Speedbird three zero six on one two eight decimal one, currently maintaining flight level three two zero. We are experiencing light chop here, requesting climb to flight level three six zero for smoother ride.',
    templateText:
      'Speedbird 306 currently maintaining {{0}}. Experiencing light {{1}}, requesting climb to {{2}} for a smoother ride.',
    blanks: [
      { answer: 'FL320', accepted: ['FL320', '320', 'FL 320'], hint: 'Current flight level' },
      { answer: 'chop', accepted: ['chop', 'light chop', 'turbulence'], hint: 'Air condition' },
      { answer: 'FL360', accepted: ['FL360', '360', 'FL 360'], hint: 'Requested level' },
    ],
    phaseOfFlight: 'Cruise',
    contextSummary:
      'During cruise, the aircraft encounters uncomfortable light turbulence (chop) and asks Paris Control for a step climb to a higher flight level where upper-air forecasts indicate smoother conditions.',
    usefulVocabulary: [
      { term: 'Light chop', meaning: 'Mild, rhythmic bumpiness in flight that does not affect aircraft attitude or altitude.' },
      { term: 'Smoother ride', meaning: 'Calmer air with less turbulence for passenger comfort.' },
      { term: 'Requesting climb', meaning: 'Asking ATC for clearance to ascend to a higher flight level.' },
    ],
    voiceName: 'Orus',
  },
  {
    messageType: 'non_routine',
    callsign: 'Transavia 3214',
    sector: 'Toulouse Departure',
    frequencyMHz: '121.250',
    title: 'Bird Strike After Lift-Off — Stopping Climb',
    spokenScript:
      'Toulouse Departure, Transavia three two one four, passing four thousand feet. We experienced a bird strike on rotation on the right engine. Engine parameters are normal, stopping climb at six thousand feet to run checklists and requesting return to Toulouse.',
    templateText:
      'Transavia 3214 passing 4,000 ft. Experienced a {{0}} on rotation on the right engine. Stopping climb at {{1}} ft to run checklists and requesting {{2}} to Toulouse.',
    blanks: [
      { answer: 'bird strike', accepted: ['bird strike', 'birdstrike', 'birds'], hint: 'Incident on take-off' },
      { answer: '6000', accepted: ['6000', '6,000', 'six thousand'], hint: 'Level-off altitude' },
      { answer: 'return', accepted: ['return', 'to return', 'air turnback'], hint: 'Requested intention' },
    ],
    phaseOfFlight: 'Initial Climb',
    contextSummary:
      'Immediately after take-off, the crew hits a bird on the right engine. Although instruments currently appear normal, standard airline procedure requires leveling off safely to complete abnormal checklists and returning for inspection.',
    usefulVocabulary: [
      { term: 'Bird strike', meaning: 'A collision between an aircraft and one or more birds, usually during take-off or landing.' },
      { term: 'On rotation', meaning: 'At the moment the pilot pulls back on the controls to lift the nose off the runway.' },
      { term: 'Engine parameters', meaning: 'Cockpit readings such as thrust (N1), exhaust temperature (EGT), and oil pressure.' },
    ],
    voiceName: 'Puck',
  },
  {
    messageType: 'routine',
    callsign: 'KLM 1233',
    sector: 'Paris Approach',
    frequencyMHz: '119.855',
    title: 'Initial Descent & ATIS Confirmation',
    spokenScript:
      'Paris Approach, KLM one two three three on one one niner decimal eight five five, descending to flight level one zero zero, heading two six zero, speed two five zero knots, Information Delta on board.',
    templateText:
      'KLM 1233 descending to {{0}}, heading 260, speed {{1}} knots, Information {{2}} on board.',
    blanks: [
      { answer: 'FL100', accepted: ['FL100', '100', 'FL 100', 'flight level 100'], hint: 'Cleared flight level' },
      { answer: '250', accepted: ['250', '250 kt', '250 knots'], hint: 'Indicated airspeed' },
      { answer: 'Delta', accepted: ['Delta', 'D'], hint: 'ATIS letter' },
    ],
    phaseOfFlight: 'Descent / Approach',
    contextSummary:
      'Routine first contact with Approach Control entering the Paris terminal area. Reporting cleared level, assigned heading, current speed, and the ATIS letter prevents extra controller questions during busy arrival periods.',
    usefulVocabulary: [
      { term: 'Information Delta on board', meaning: 'Confirming the crew has already listened to ATIS broadcast Delta.' },
      { term: 'Speed 250 knots', meaning: 'Reporting indicated airspeed, standard maximum below FL100 in European airspace.' },
      { term: 'Heading 260', meaning: 'Confirming the current magnetic radar vector assigned by the previous controller.' },
    ],
    voiceName: 'Kore',
  },
  {
    messageType: 'non_routine',
    callsign: 'Ryanair 6482',
    sector: 'Lyon Approach',
    frequencyMHz: '120.450',
    title: 'Windshear Go-Around on Short Final',
    spokenScript:
      'Lyon Tower, Ryanair six four eight two, going around runway three five right due to windshear warning at five hundred feet, climbing straight ahead to four thousand feet.',
    templateText:
      'Ryanair 6482 {{0}} Runway 35R due to {{1}} warning at 500 ft, climbing straight ahead to {{2}} ft.',
    blanks: [
      { answer: 'going around', accepted: ['going around', 'go around', 'go-around'], hint: 'Aborted landing call' },
      { answer: 'windshear', accepted: ['windshear', 'wind shear'], hint: 'Cockpit weather alert' },
      { answer: '4000', accepted: ['4000', '4,000', 'four thousand'], hint: 'Missed approach altitude' },
    ],
    phaseOfFlight: 'Final Approach / Go-Around',
    contextSummary:
      'At 500 feet above the runway, a predictive or reactive windshear warning triggers in the flight deck. The crew immediately aborts the landing, applies go-around thrust, and notifies ATC of their climb altitude.',
    usefulVocabulary: [
      { term: 'Going around', meaning: 'Aborting the landing approach and climbing back into the air (missed approach).' },
      { term: 'Windshear', meaning: 'A sudden, dangerous change in wind speed or direction over a short distance.' },
      { term: 'Straight ahead', meaning: 'Continuing along the runway centerline heading during the initial climb.' },
    ],
    voiceName: 'Fenrir',
  },
  {
    messageType: 'routine',
    callsign: 'Swiss 644',
    sector: 'Geneva Radar',
    frequencyMHz: '131.325',
    title: 'Requesting Early Descent to Avoid High Speed',
    spokenScript:
      'Geneva Radar, Swiss six four four on one three one decimal three two five, maintaining flight level two eight zero, seventy miles from Geneva, requesting descent now due to strong tailwind.',
    templateText:
      'Swiss 644 maintaining {{0}}, {{1}} miles from Geneva, requesting descent now due to strong {{2}}.',
    blanks: [
      { answer: 'FL280', accepted: ['FL280', '280', 'FL 280'], hint: 'Current flight level' },
      { answer: '70', accepted: ['70', 'seventy', '70 miles'], hint: 'Distance from airport' },
      { answer: 'tailwind', accepted: ['tailwind', 'tail wind'], hint: 'Wind factor' },
    ],
    phaseOfFlight: 'Top of Descent',
    contextSummary:
      'Because a strong tailwind increases ground speed, the aircraft needs more distance to lose altitude comfortably. The pilot asks Geneva Radar to start descending earlier than usual.',
    usefulVocabulary: [
      { term: 'Top of descent', meaning: 'The calculated point where an aircraft transitions from cruise to descent.' },
      { term: 'Tailwind', meaning: 'Wind blowing from behind the aircraft, increasing ground speed and required descent distance.' },
      { term: 'Requesting descent', meaning: 'Asking ATC for clearance to leave cruise altitude toward the destination.' },
    ],
    voiceName: 'Charon',
  },
  {
    messageType: 'non_routine',
    callsign: 'Vueling 1824',
    sector: 'Marseille Control',
    frequencyMHz: '133.055',
    title: 'Cabin Pressurisation Caution — Emergency Descent',
    spokenScript:
      'Marseille Control, MAYDAY, MAYDAY, MAYDAY, Vueling one eight two four, cabin altitude warning, initiating emergency descent to flight level one zero zero, turning right twenty degrees off track.',
    templateText:
      'MAYDAY, Vueling 1824, {{0}} warning, initiating {{1}} to {{2}}, turning right 20 degrees off track.',
    blanks: [
      { answer: 'cabin altitude', accepted: ['cabin altitude', 'pressurisation', 'pressurization'], hint: 'Cockpit warning' },
      { answer: 'emergency descent', accepted: ['emergency descent', 'descent'], hint: 'Immediate manoeuvre' },
      { answer: 'FL100', accepted: ['FL100', '100', 'FL 100'], hint: 'Target safe flight level' },
    ],
    phaseOfFlight: 'Cruise — Emergency Descent',
    contextSummary:
      'Loss of cabin pressurisation forces the crew to put on oxygen masks, declare MAYDAY, offset slightly off the airway to avoid traffic below, and descend rapidly to FL100 where passengers can breathe normally.',
    usefulVocabulary: [
      { term: 'MAYDAY', meaning: 'Distress call repeated three times for grave and imminent danger requiring immediate assistance.' },
      { term: 'Cabin altitude warning', meaning: 'Alert showing cabin air pressure is dropping toward unsafe high-altitude levels.' },
      { term: 'Emergency descent', meaning: 'Rapid, high-rate descent to 10,000 feet (FL100) to reach breathable air.' },
    ],
    voiceName: 'Orus',
  },
  {
    messageType: 'routine',
    callsign: 'Hop 1422',
    sector: 'Toulouse Approach',
    frequencyMHz: '121.250',
    title: 'Established on ILS Localizer',
    spokenScript:
      'Toulouse Approach, Hop one four two two on one two one decimal two five zero, established on the ILS localizer runway three two left, descending on the glide path, twelve miles final.',
    templateText:
      'Hop 1422 established on the ILS {{0}} Runway {{1}}, descending on the glide path, {{2}} miles final.',
    blanks: [
      { answer: 'localizer', accepted: ['localizer', 'localiser', 'ILS'], hint: 'Lateral ILS guidance' },
      { answer: '32L', accepted: ['32L', '32 left', '32l'], hint: 'Approach runway' },
      { answer: '12', accepted: ['12', 'twelve', '12 miles'], hint: 'Distance from touchdown' },
    ],
    phaseOfFlight: 'Final Approach',
    contextSummary:
      'The regional aircraft has captured both the horizontal localizer beam and the vertical glide path for Runway 32L at Toulouse-Blagnac and reports established before transfer to Toulouse Tower.',
    usefulVocabulary: [
      { term: 'Established on the localizer', meaning: 'Aligned accurately with the ILS radio centerline leading to the runway.' },
      { term: 'Glide path', meaning: 'The vertical descent beam (normally 3 degrees) guiding the aircraft down to touchdown.' },
      { term: '12 miles final', meaning: 'Twelve nautical miles from the runway threshold on the final approach track.' },
    ],
    voiceName: 'Kore',
  },
  {
    messageType: 'non_routine',
    callsign: 'Air France 1480',
    sector: 'London Control',
    frequencyMHz: '134.900',
    title: 'TCAS Resolution Advisory (Climb)',
    spokenScript:
      'London Control, Air France one four eight zero, TCAS RA, climbing out of flight level two niner zero. Will report clear of conflict.',
    templateText:
      'Air France 1480, {{0}}, {{1}} out of {{2}}. Will report clear of conflict.',
    blanks: [
      { answer: 'TCAS RA', accepted: ['TCAS RA', 'TCAS', 'resolution advisory'], hint: 'Collision avoidance alert' },
      { answer: 'climbing', accepted: ['climbing', 'climb'], hint: 'Vertical avoidance manoeuvre' },
      { answer: 'FL290', accepted: ['FL290', '290', 'FL 290'], hint: 'Assigned flight level left' },
    ],
    phaseOfFlight: 'Cruise',
    contextSummary:
      'The onboard Traffic Collision Avoidance System commands an immediate climb to resolve a conflict with nearby traffic. Pilots MUST follow the TCAS RA immediately and inform ATC without waiting for clearance.',
    usefulVocabulary: [
      { term: 'TCAS RA', meaning: 'Traffic Collision Avoidance System Resolution Advisory—a mandatory cockpit climb or descend command.' },
      { term: 'Clear of conflict', meaning: 'Phrase reported once the threat has passed and the aircraft is returning to its cleared level.' },
      { term: 'Out of FL290', meaning: 'Leaving flight level 290 immediately to comply with the avoidance advisory.' },
    ],
    voiceName: 'Puck',
  },
  {
    messageType: 'routine',
    callsign: 'Iberia 3402',
    sector: 'Madrid Control',
    frequencyMHz: '132.575',
    title: 'Position & Estimate Report',
    spokenScript:
      'Madrid Control, Iberia three four zero two, maintaining flight level three five zero, overhead PAMPLONA at time one zero two four, estimating TOULOUSE at one zero four one.',
    templateText:
      'Iberia 3402 maintaining {{0}}, overhead {{1}} at 10:24Z, estimating Toulouse at {{2}}Z.',
    blanks: [
      { answer: 'FL350', accepted: ['FL350', '350', 'FL 350'], hint: 'Cruise level' },
      { answer: 'PAMPLONA', accepted: ['PAMPLONA', 'Pamplona'], hint: 'Waypoint passed' },
      { answer: '1041', accepted: ['1041', '10:41', '1041Z'], hint: 'Estimated time (4 digits)' },
    ],
    phaseOfFlight: 'Cruise',
    contextSummary:
      'Classic ICAO position report giving current level, the waypoint just crossed with its exact UTC time, and the estimated arrival time over the next reporting fix.',
    usefulVocabulary: [
      { term: 'Overhead [waypoint]', meaning: 'Passing directly above a navigation beacon or fix.' },
      { term: 'Estimating [fix] at [time]', meaning: 'Reporting the predicted UTC time over the next waypoint.' },
      { term: 'Time 1024', meaning: 'UTC (Zulu) clock time expressed in four digits.' },
    ],
    voiceName: 'Fenrir',
  },
  {
    messageType: 'non_routine',
    callsign: 'EasyJet 1344',
    sector: 'Geneva Approach',
    frequencyMHz: '131.325',
    title: 'Yellow Hydraulic Low Pressure — Long Final',
    spokenScript:
      'Geneva Approach, PAN PAN, PAN PAN, PAN PAN, EasyJet one three four four. We have a yellow hydraulic system low pressure fault. Expecting normal flaps but reduced braking; requesting a fifteen mile final for runway two two and fire services on standby.',
    templateText:
      'PAN PAN, EasyJet 1344: {{0}} hydraulic system low pressure fault. Requesting a {{1}} mile final for Runway 22 and {{2}} on standby.',
    blanks: [
      { answer: 'yellow', accepted: ['yellow', 'yellow hydraulic'], hint: 'Affected hydraulic circuit' },
      { answer: '15', accepted: ['15', 'fifteen', '15 mile'], hint: 'Requested final length' },
      { answer: 'fire services', accepted: ['fire services', 'fire', 'rescue', 'fire brigade'], hint: 'Airport emergency units' },
    ],
    phaseOfFlight: 'Approach / Abnormal Landing',
    contextSummary:
      'A hydraulic fault affects one braking/steering circuit on an A320. The pilot declares PAN PAN, asks for a longer final approach to configure early, and requests airport fire trucks on standby as a precaution.',
    usefulVocabulary: [
      { term: 'Hydraulic system fault', meaning: 'Malfunction in one of the pressurized fluid circuits powering flight controls, flaps, or brakes.' },
      { term: 'Reduced braking', meaning: 'Longer landing roll expected due to alternate or degraded brake system.' },
      { term: 'Fire services on standby', meaning: 'Airport fire trucks positioned near the runway ready to assist if needed.' },
    ],
    voiceName: 'Charon',
  },
  {
    messageType: 'routine',
    callsign: 'Beeline 2183',
    sector: 'Brussels Departure',
    frequencyMHz: '126.625',
    title: 'Airborne Call on SID Departure',
    spokenScript:
      'Brussels Departure, Beeline two one eight three on one two six decimal six two five, airborne runway two five right, passing two thousand three hundred feet, climbing flight level six zero on Chievres four Charlie departure.',
    templateText:
      'Beeline 2183 airborne Runway {{0}}, passing {{1}} ft, climbing to FL60 on {{2}} departure.',
    blanks: [
      { answer: '25R', accepted: ['25R', '25 right', '25r'], hint: 'Departure runway' },
      { answer: '2300', accepted: ['2300', '2,300', 'two thousand three hundred'], hint: 'Passing altitude (ft)' },
      { answer: 'CIV 4C', accepted: ['CIV 4C', 'Chievres 4 Charlie', 'Chievres four Charlie', 'Chievres 4C'], hint: 'SID name' },
    ],
    phaseOfFlight: 'Initial Climb',
    contextSummary:
      'First radio contact with Departure radar right after take-off from Brussels. Reporting passing altitude allows the controller to verify Mode C transponder readout immediately.',
    usefulVocabulary: [
      { term: 'Airborne', meaning: 'The aircraft has lifted off the runway and is climbing.' },
      { term: 'Passing 2,300 feet', meaning: 'Current altitude reported so radar can verify altitude readout.' },
      { term: 'SID departure', meaning: 'Standard Instrument Departure route connecting the runway to the en-route airway.' },
    ],
    voiceName: 'Kore',
  },
  {
    messageType: 'non_routine',
    callsign: 'Speedbird 458',
    sector: 'London Control',
    frequencyMHz: '134.900',
    title: 'Unruly Passenger — Police Requested on Stand',
    spokenScript:
      'London Control, Speedbird four five eight, descending flight level one eight zero. Please coordinate with Heathrow operations: we have an unruly passenger restrained by cabin crew and require police assistance meeting the aircraft on arrival.',
    templateText:
      'Speedbird 458 descending {{0}}. We have an {{1}} restrained by cabin crew and require {{2}} meeting the aircraft on arrival.',
    blanks: [
      { answer: 'FL180', accepted: ['FL180', '180', 'FL 180'], hint: 'Cleared level' },
      { answer: 'unruly passenger', accepted: ['unruly passenger', 'disruptive passenger'], hint: 'Cabin security issue' },
      { answer: 'police', accepted: ['police', 'police assistance'], hint: 'Requested authorities' },
    ],
    phaseOfFlight: 'Descent',
    contextSummary:
      'A disruptive passenger has been restrained in the cabin. The flight continues normally to Heathrow, while the crew asks ATC to relay a message so airport police are waiting at the gate upon arrival.',
    usefulVocabulary: [
      { term: 'Unruly passenger', meaning: 'A disruptive or aggressive passenger who fails to follow crew safety instructions.' },
      { term: 'Restrained by cabin crew', meaning: 'Safely secured by flight attendants to protect passengers and flight safety.' },
      { term: 'Police assistance on arrival', meaning: 'Requesting law enforcement officers to meet the aircraft at the gate.' },
    ],
    voiceName: 'Orus',
  },
  {
    messageType: 'routine',
    callsign: 'Austrian 413',
    sector: 'Vienna Radar',
    frequencyMHz: '125.175',
    title: 'Requesting Speed Increase to Make Slot',
    spokenScript:
      'Vienna Radar, Austrian four one three, maintaining flight level three four zero, Mach zero decimal seven eight. Requesting high speed Mach zero decimal eight one to recover a ten minute delay.',
    templateText:
      'Austrian 413 maintaining {{0}}, currently Mach {{1}}. Requesting Mach {{2}} to recover a 10-minute delay.',
    blanks: [
      { answer: 'FL340', accepted: ['FL340', '340', 'FL 340'], hint: 'Cruise level' },
      { answer: '0.78', accepted: ['0.78', '.78', 'zero decimal seven eight'], hint: 'Current Mach number' },
      { answer: '0.81', accepted: ['0.81', '.81', 'zero decimal eight one'], hint: 'Requested Mach number' },
    ],
    phaseOfFlight: 'Cruise',
    contextSummary:
      'When ATC has assigned or expects a standard cruise Mach number, pilots must ask permission before accelerating so longitudinal separation with aircraft ahead is maintained.',
    usefulVocabulary: [
      { term: 'Mach 0.78', meaning: 'Aircraft speed expressed as a fraction of the local speed of sound (78% of Mach 1).' },
      { term: 'High speed', meaning: 'Cruising faster than normal economy speed to make up schedule time.' },
      { term: 'Recover a delay', meaning: 'Catch up on lost schedule time during the en-route phase.' },
    ],
    voiceName: 'Puck',
  },
  {
    messageType: 'non_routine',
    callsign: 'Volotea 2514',
    sector: 'Marseille Approach',
    frequencyMHz: '120.205',
    title: 'Minimum Fuel Advisory in Holding Pattern',
    spokenScript:
      'Marseille Approach, Volotea two five one four, entering the hold at MARTIGUES flight level one zero zero. Advising MINIMUM FUEL: we have twenty minutes of holding remaining before diverting to Montpellier.',
    templateText:
      'Volotea 2514 entering hold at Martigues FL100. Advising {{0}}: we have {{1}} minutes of holding remaining before diverting to {{2}}.',
    blanks: [
      { answer: 'MINIMUM FUEL', accepted: ['MINIMUM FUEL', 'minimum fuel'], hint: 'ICAO fuel status call' },
      { answer: '20', accepted: ['20', 'twenty', '20 minutes'], hint: 'Remaining hold time' },
      { answer: 'Montpellier', accepted: ['Montpellier', 'LFMT'], hint: 'Alternate airport' },
    ],
    phaseOfFlight: 'Holding / Arrival',
    contextSummary:
      'Under ICAO rules, MINIMUM FUEL is NOT an emergency yet—it warns ATC that any unexpected extra delay could force the aircraft to land with less than final reserve fuel, so no further unplanned delays can be accepted.',
    usefulVocabulary: [
      { term: 'MINIMUM FUEL', meaning: 'ICAO advisory telling ATC that any additional delay will cause landing below final reserve fuel.' },
      { term: 'Entering the hold', meaning: 'Flying a racetrack holding pattern over a fix while awaiting approach sequence.' },
      { term: 'Diverting to [alternate]', meaning: 'Leaving the hold to fly to the planned backup airport.' },
    ],
    voiceName: 'Fenrir',
  },
  {
    messageType: 'routine',
    callsign: 'Air France 7705',
    sector: 'Nice Approach',
    frequencyMHz: '124.175',
    title: 'Visual Approach Request — Runway 04L',
    spokenScript:
      'Nice Approach, Air France seven seven zero five on one two four decimal one seven five, descending four thousand feet. We have the field in sight at fourteen miles, requesting visual approach runway zero four left.',
    templateText:
      'Air France 7705 descending {{0}} ft. Field in sight at {{1}} miles, requesting visual approach Runway {{2}}.',
    blanks: [
      { answer: '4000', accepted: ['4000', '4,000', 'four thousand'], hint: 'Cleared altitude (ft)' },
      { answer: '14', accepted: ['14', 'fourteen', '14 miles'], hint: 'Distance from airport' },
      { answer: '04L', accepted: ['04L', '4L', '04 left', '4 left'], hint: 'Landing runway' },
    ],
    phaseOfFlight: 'Approach',
    contextSummary:
      'In clear Mediterranean weather at Nice, the crew spots the airport early and requests a visual approach to shorten the arrival path while maintaining visual separation from terrain and traffic.',
    usefulVocabulary: [
      { term: 'Field in sight', meaning: 'The flight crew can clearly see the destination airport and runway.' },
      { term: 'Visual approach', meaning: 'An IFR approach flown by visual reference to the runway instead of following the full instrument procedure.' },
      { term: '14 miles', meaning: 'Distance in nautical miles from the aerodrome.' },
    ],
    voiceName: 'Kore',
  },
  {
    messageType: 'non_routine',
    callsign: 'KLM 1671',
    sector: 'Amsterdam Approach',
    frequencyMHz: '119.055',
    title: 'Nose Landing Gear Disagreement — Holding to Troubleshoot',
    spokenScript:
      'Schiphol Approach, KLM one six seven one, leveling off at three thousand feet. We have a nose gear unsafe indication; requesting radar vectors to a holding area for ten minutes to complete the abnormal checklist.',
    templateText:
      'KLM 1671 leveling off at {{0}} ft. We have a {{1}} unsafe indication; requesting holding for {{2}} minutes to complete the checklist.',
    blanks: [
      { answer: '3000', accepted: ['3000', '3,000', 'three thousand'], hint: 'Level-off altitude' },
      { answer: 'nose gear', accepted: ['nose gear', 'nose landing gear', 'gear'], hint: 'Affected landing gear' },
      { answer: '10', accepted: ['10', 'ten', '10 minutes'], hint: 'Requested holding duration' },
    ],
    phaseOfFlight: 'Intermediate Approach',
    contextSummary:
      'When extending the landing gear, the nose wheel fails to show a green locked indication. Rather than rushing the landing, the crew levels off and asks Approach for a short hold to run troubleshooting steps.',
    usefulVocabulary: [
      { term: 'Unsafe indication', meaning: 'Cockpit warning that a landing gear leg is not confirmed down and locked.' },
      { term: 'Leveling off', meaning: 'Stopping a climb or descent to maintain a steady altitude.' },
      { term: 'Abnormal checklist', meaning: 'Step-by-step flight manual procedure for handling a system malfunction.' },
    ],
    voiceName: 'Charon',
  },
  {
    messageType: 'routine',
    callsign: 'Lufthansa 1031',
    sector: 'Langen Radar',
    frequencyMHz: '120.155',
    title: 'Moderate Icing Report During Climb',
    spokenScript:
      'Langen Radar, Lufthansa one zero three one, passing flight level one six zero climbing flight level two four zero. Reporting moderate airframe icing between flight level one two zero and one six zero, wing anti-ice is on.',
    templateText:
      'Lufthansa 1031 passing {{0}}. Reporting moderate {{1}} between FL120 and FL160; {{2}} anti-ice is on.',
    blanks: [
      { answer: 'FL160', accepted: ['FL160', '160', 'FL 160'], hint: 'Passing flight level' },
      { answer: 'icing', accepted: ['icing', 'airframe icing'], hint: 'Weather condition' },
      { answer: 'wing', accepted: ['wing', 'wing anti-ice'], hint: 'Protected surface' },
    ],
    phaseOfFlight: 'Climb',
    contextSummary:
      'A pilot weather report (PIREP) informs ATC of moderate icing encountered in clouds during climb, allowing the controller to warn following departures and arriving aircraft.',
    usefulVocabulary: [
      { term: 'Airframe icing', meaning: 'Ice building up on wings and fuselage when flying through supercooled cloud droplets.' },
      { term: 'Wing anti-ice', meaning: 'Heated bleed-air system preventing ice formation on the wing leading edges.' },
      { term: 'Between FL120 and FL160', meaning: 'The vertical altitude band where the weather hazard was encountered.' },
    ],
    voiceName: 'Orus',
  },
  {
    messageType: 'non_routine',
    callsign: 'Shamrock 524',
    sector: 'Paris Control',
    frequencyMHz: '128.100',
    title: 'Smoke Odour in Forward Galley — Priority Return',
    spokenScript:
      'Paris Control, PAN PAN, PAN PAN, PAN PAN, Shamrock five two four, passing flight level two one zero. Cabin crew report an electrical smoke smell in the forward galley. Power to the galley is isolated; requesting immediate vectors back to Charles de Gaulle.',
    templateText:
      'PAN PAN, Shamrock 524 passing {{0}}. Electrical {{1}} smell in the forward galley. Power is isolated; requesting immediate vectors back to {{2}}.',
    blanks: [
      { answer: 'FL210', accepted: ['FL210', '210', 'FL 210'], hint: 'Passing flight level' },
      { answer: 'smoke', accepted: ['smoke', 'smoke smell', 'burning'], hint: 'Cabin hazard' },
      { answer: 'Charles de Gaulle', accepted: ['Charles de Gaulle', 'CDG', 'LFPG', 'Paris CDG'], hint: 'Return airport' },
    ],
    phaseOfFlight: 'Climb — Air Turnback',
    contextSummary:
      'An electrical burning odour in the galley is treated seriously even after circuit breakers are pulled. The crew declares PAN PAN and asks for immediate radar vectors back to the departure airport.',
    usefulVocabulary: [
      { term: 'Forward galley', meaning: 'The front aircraft kitchen area where ovens and coffee makers are located.' },
      { term: 'Power isolated', meaning: 'Electrical supply switched off to stop potential overheating or fire.' },
      { term: 'Immediate vectors', meaning: 'Direct radar headings from ATC to turn back toward the runway quickly.' },
    ],
    voiceName: 'Puck',
  },
  {
    messageType: 'routine',
    callsign: 'ITA Airways 318',
    sector: 'Rome Radar',
    frequencyMHz: '125.500',
    title: 'Confirming Mach Number Restriction',
    spokenScript:
      'Rome Radar, ITA three one eight on one two five decimal five, maintaining flight level three six zero, maintaining Mach zero decimal seven niner as instructed for spacing behind preceding traffic.',
    templateText:
      'ITA 318 on {{0}} MHz, maintaining {{1}}, holding Mach {{2}} as instructed for spacing.',
    blanks: [
      { answer: '125.5', accepted: ['125.5', '125.500', '125.50'], hint: 'Radar frequency' },
      { answer: 'FL360', accepted: ['FL360', '360', 'FL 360'], hint: 'Cruise level' },
      { answer: '0.79', accepted: ['0.79', '.79'], hint: 'Assigned Mach speed' },
    ],
    phaseOfFlight: 'Cruise',
    contextSummary:
      'Whenever an aircraft transfers to a new en-route sector while under a speed restriction, the pilot must state the assigned Mach number on first contact so the new controller knows spacing is protected.',
    usefulVocabulary: [
      { term: 'As instructed', meaning: 'Confirming compliance with an active restriction given by the previous sector.' },
      { term: 'For spacing', meaning: 'Speed control used by ATC to keep safe distance between aircraft on the same airway.' },
      { term: 'Preceding traffic', meaning: 'An aircraft flying ahead along the same route.' },
    ],
    voiceName: 'Fenrir',
  },
  {
    messageType: 'non_routine',
    callsign: 'Air France 6115',
    sector: 'Toulouse Tower',
    frequencyMHz: '118.100',
    title: 'Rejected Take-Off — Brake Cooling on Taxiway',
    spokenScript:
      'Toulouse Tower, Air France six one one five, stopping on runway three two right, rejected take-off due to an engine warning light at eighty knots. Vacating right at Echo four and requesting brake temperature check.',
    templateText:
      'Air France 6115 stopping on Runway 32R: {{0}} due to an engine warning light at {{1}} knots. Vacating at {{2}} for a brake temperature check.',
    blanks: [
      { answer: 'rejected take-off', accepted: ['rejected take-off', 'rejected takeoff', 'RTO', 'aborted takeoff'], hint: 'Stopped departure manoeuvre' },
      { answer: '80', accepted: ['80', 'eighty', '80 knots'], hint: 'Speed when rejected' },
      { answer: 'E4', accepted: ['E4', 'Echo 4', 'Echo four'], hint: 'Exit taxiway' },
    ],
    phaseOfFlight: 'Take-Off Roll (Rejected Take-Off)',
    contextSummary:
      'At low speed (80 knots, well below V1), an engine caution triggers and the captain safely aborts the take-off, notifies Tower immediately, and exits onto a taxiway to check brake heat.',
    usefulVocabulary: [
      { term: 'Rejected take-off (RTO)', meaning: 'Stopping the aircraft on the runway before lift-off because of a fault or hazard.' },
      { term: '80 knots', meaning: 'Low-speed take-off callout speed below V1 where stopping safely is straightforward.' },
      { term: 'Brake temperature check', meaning: 'Monitoring wheel brake heat after heavy braking to ensure safe taxiing.' },
    ],
    voiceName: 'Charon',
  },
  {
    messageType: 'routine',
    callsign: 'Scandinavian 565',
    sector: 'Copenhagen Control',
    frequencyMHz: '124.975',
    title: 'Checking In — Requesting Weather Information Ahead',
    spokenScript:
      'Copenhagen Control, Scandinavian five six five, maintaining flight level three four zero, twenty miles north of ODIN. Could you advise if any aircraft ahead have reported turbulence at flight level three six zero?',
    templateText:
      'Scandinavian 565 maintaining {{0}}, 20 miles north of {{1}}. Asking if aircraft ahead reported {{2}} at FL360.',
    blanks: [
      { answer: 'FL340', accepted: ['FL340', '340', 'FL 340'], hint: 'Current level' },
      { answer: 'ODIN', accepted: ['ODIN', 'Odin'], hint: 'Navigation fix' },
      { answer: 'turbulence', accepted: ['turbulence', 'chop'], hint: 'Ride report topic' },
    ],
    phaseOfFlight: 'Cruise',
    contextSummary:
      'Before requesting a step climb for fuel efficiency, the crew checks with the sector controller to find out whether recent pilot ride reports show smooth air at the higher flight level.',
    usefulVocabulary: [
      { term: 'Ride report', meaning: 'Pilot feedback describing turbulence levels at a specific altitude.' },
      { term: 'Aircraft ahead', meaning: 'Traffic that has recently flown through the same airspace sector.' },
      { term: 'Step climb', meaning: 'Climbing to a higher cruise level as the aircraft burns fuel and gets lighter.' },
    ],
    voiceName: 'Kore',
  },
  {
    messageType: 'non_routine',
    callsign: 'EasyJet 4620',
    sector: 'Bordeaux Approach',
    frequencyMHz: '120.250',
    title: 'Flap Jam — Higher Approach Speed Required',
    spokenScript:
      'Bordeaux Approach, PAN PAN, PAN PAN, PAN PAN, EasyJet four six two zero, descending three thousand feet. We have a flaps locked at position one fault; our final approach speed will be one six five knots, requesting runway two three.',
    templateText:
      'PAN PAN, EasyJet 4620 descending 3,000 ft. {{0}} locked at position 1; final approach speed will be {{1}} knots, requesting Runway {{2}}.',
    blanks: [
      { answer: 'flaps', accepted: ['flaps', 'flap'], hint: 'Flight control surface' },
      { answer: '165', accepted: ['165', '165 kt', '165 knots'], hint: 'Higher approach speed' },
      { answer: '23', accepted: ['23', 'two three'], hint: 'Requested runway' },
    ],
    phaseOfFlight: 'Approach — Abnormal Configuration',
    contextSummary:
      'With flaps stuck at an intermediate setting, the aircraft must fly faster on final approach and will use more runway distance. Reporting the exact approach speed helps ATC space following arrivals properly.',
    usefulVocabulary: [
      { term: 'Flaps locked', meaning: 'Wing high-lift devices stuck at a partial setting and unable to extend fully.' },
      { term: 'Final approach speed', meaning: 'Target airspeed maintained down to the runway threshold.' },
      { term: 'Runway length', meaning: 'Longer available runway preferred when landing faster than normal.' },
    ],
    voiceName: 'Orus',
  },
  {
    messageType: 'routine',
    callsign: 'Transavia 6045',
    sector: 'Marseille Control',
    frequencyMHz: '133.055',
    title: 'Reporting Unable to Make Crossing Restriction',
    spokenScript:
      'Marseille Control, Transavia six zero four five, descending flight level two two zero. Due to our weight and tailwind, we are unable to be level at flight level one five zero by AVIGNON; we can cross at flight level one seven zero.',
    templateText:
      'Transavia 6045 descending FL220: {{0}} to be level at {{1}} by Avignon; able to cross at {{2}}.',
    blanks: [
      { answer: 'unable', accepted: ['unable', 'not able'], hint: 'Standard ICAO refusal word' },
      { answer: 'FL150', accepted: ['FL150', '150', 'FL 150'], hint: 'Original ATC restriction' },
      { answer: 'FL170', accepted: ['FL170', '170', 'FL 170'], hint: 'Achievable crossing level' },
    ],
    phaseOfFlight: 'Descent',
    contextSummary:
      'When an aircraft cannot safely meet an ATC altitude crossing restriction without excessive speed, ICAO phraseology requires reporting "unable" promptly and offering what level the aircraft can achieve.',
    usefulVocabulary: [
      { term: 'Unable', meaning: 'Standard ICAO word telling ATC the aircraft cannot comply with a clearance or restriction.' },
      { term: 'Level by [waypoint]', meaning: 'Reaching an assigned altitude before passing a specific fix.' },
      { term: 'Crossing restriction', meaning: 'An altitude or speed target assigned at a named waypoint for traffic separation.' },
    ],
    voiceName: 'Puck',
  },
  {
    messageType: 'non_routine',
    callsign: 'Air Dolomiti 8412',
    sector: 'Munich Approach',
    frequencyMHz: '120.775',
    title: 'Laser Illumination on Approach',
    spokenScript:
      'Munich Approach, Air Dolomiti eight four one two, descending five thousand feet on downwind runway two six left. Reporting a green laser illumination from the right side about six miles east of the field.',
    templateText:
      'Air Dolomiti 8412 descending 5,000 ft. Reporting a {{0}} {{1}} illumination from the right side, {{2}} miles east of the field.',
    blanks: [
      { answer: 'green', accepted: ['green'], hint: 'Light colour' },
      { answer: 'laser', accepted: ['laser', 'laser beam'], hint: 'Hazard aimed at cockpit' },
      { answer: '6', accepted: ['6', 'six', '6 miles'], hint: 'Distance east of field' },
    ],
    phaseOfFlight: 'Approach',
    contextSummary:
      'Someone on the ground shines a handheld laser toward the flight deck. The crew reports the colour, side, and approximate location immediately so ATC can warn other pilots and notify local police.',
    usefulVocabulary: [
      { term: 'Laser illumination', meaning: 'A bright laser beam directed from the ground into an aircraft cockpit, creating a blinding hazard.' },
      { term: 'Downwind', meaning: 'Approach leg flown parallel to the runway in the opposite direction of landing.' },
      { term: 'East of the field', meaning: 'Geographic reference relative to the airport to help authorities locate the source.' },
    ],
    voiceName: 'Fenrir',
  },
  {
    messageType: 'routine',
    callsign: 'Hop 1834',
    sector: 'Lyon Departure',
    frequencyMHz: '120.450',
    title: 'Reporting Clear of Weather — Resuming Own Navigation',
    spokenScript:
      'Lyon Departure, Hop one eight three four, passing flight level one niner zero. We are now clear of weather and able to resume own navigation direct to MOUSS.',
    templateText:
      'Hop 1834 passing {{0}}. Now {{1}} of weather and able to resume own navigation direct to {{2}}.',
    blanks: [
      { answer: 'FL190', accepted: ['FL190', '190', 'FL 190'], hint: 'Passing flight level' },
      { answer: 'clear', accepted: ['clear', 'clear of weather'], hint: 'Weather status' },
      { answer: 'MOUSS', accepted: ['MOUSS', 'Mouss'], hint: 'Next route waypoint' },
    ],
    phaseOfFlight: 'Climb',
    contextSummary:
      'After deviating around storm clouds during climb, the pilot notifies ATC that the weather cells are behind them and requests clearance to rejoin the filed route directly to the next fix.',
    usefulVocabulary: [
      { term: 'Clear of weather', meaning: 'No longer affected by storm clouds or turbulence and ready to return to course.' },
      { term: 'Resume own navigation', meaning: 'Returning from radar headings/deviations back to flying the planned flight-plan track.' },
      { term: 'Direct to [fix]', meaning: 'Turning straight toward the requested waypoint.' },
    ],
    voiceName: 'Kore',
  },
  {
    messageType: 'non_routine',
    callsign: 'Air France 1582',
    sector: 'Paris Control',
    frequencyMHz: '128.100',
    title: 'Engine Vibration — Precautionary Idle & Descent',
    spokenScript:
      'Paris Control, PAN PAN, PAN PAN, PAN PAN, Air France one five eight two, flight level three three zero. We have high vibration on engine number two and have reduced it to idle. Requesting descent to flight level two zero zero and diversion to Lyon.',
    templateText:
      'PAN PAN, Air France 1582 at FL330: high {{0}} on engine number {{1}}, reduced to idle. Requesting descent to FL200 and diversion to {{2}}.',
    blanks: [
      { answer: 'vibration', accepted: ['vibration', 'engine vibration'], hint: 'Engine indication' },
      { answer: '2', accepted: ['2', 'two', 'number 2'], hint: 'Affected engine' },
      { answer: 'Lyon', accepted: ['Lyon', 'LFLL'], hint: 'Diversion airport' },
    ],
    phaseOfFlight: 'Cruise — Drift-Down / Diversion',
    contextSummary:
      'High vibration on one engine leads the crew to retard that thrust lever to idle. With reduced available thrust, the aircraft cannot sustain FL330 and requests a drift-down descent and diversion to Lyon.',
    usefulVocabulary: [
      { term: 'High vibration', meaning: 'Abnormal mechanical shaking detected by engine sensors.' },
      { term: 'Reduced to idle', meaning: 'Pulling the thrust lever back to minimum power to protect the engine.' },
      { term: 'Drift-down descent', meaning: 'Controlled descent to a lower altitude that can be maintained safely on one operating engine.' },
    ],
    voiceName: 'Charon',
  },
  {
    messageType: 'routine',
    callsign: 'Volotea 2941',
    sector: 'Toulouse Tower',
    frequencyMHz: '118.100',
    title: 'Runway Vacated & Braking Action Report',
    spokenScript:
      'Toulouse Tower, Volotea two niner four one, runway three two left vacated at Tango four. For information, braking action on the second half of the runway was medium.',
    templateText:
      'Volotea 2941, Runway {{0}} vacated at {{1}}. Braking action on the second half of the runway was {{2}}.',
    blanks: [
      { answer: '32L', accepted: ['32L', '32 left', '32l'], hint: 'Landing runway' },
      { answer: 'T4', accepted: ['T4', 'Tango 4', 'Tango four'], hint: 'Exit taxiway' },
      { answer: 'medium', accepted: ['medium', 'fair'], hint: 'Reported braking quality' },
    ],
    phaseOfFlight: 'Landing Roll / Vacating Runway',
    contextSummary:
      'After landing on a wet runway, the crew confirms clear of the active runway at Tango 4 and shares a valuable braking action report so the Tower can inform the next landing aircraft.',
    usefulVocabulary: [
      { term: 'Runway vacated', meaning: 'The entire aircraft has crossed behind the holding point markings off the runway.' },
      { term: 'Braking action medium', meaning: 'Noticeably reduced wheel deceleration compared to a dry runway, typical in heavy rain or slush.' },
      { term: 'For information', meaning: 'Polite ICAO lead-in used when sharing helpful operational observations with ATC.' },
    ],
    voiceName: 'Orus',
  },
];

export function createSeedPilotMessages(): PilotMessageExercise[] {
  return RAW_PILOT_MESSAGES.map((raw, idx) => {
    const num = idx + 1;
    const id = `pilot_${String(num).padStart(2, '0')}`;
    const blanks: GapBlank[] = raw.blanks.map((b, bIdx) => ({
      id: `${id}_b${bIdx}`,
      answer: b.answer,
      acceptedAnswers: b.accepted && b.accepted.length > 0 ? b.accepted : [b.answer],
      hint: b.hint,
    }));

    return {
      id,
      indexNumber: num,
      messageType: raw.messageType,
      callsign: raw.callsign,
      sector: raw.sector,
      frequencyMHz: raw.frequencyMHz,
      title: raw.title,
      spokenScript: raw.spokenScript,
      templateText: raw.templateText,
      blanks,
      phaseOfFlight: raw.phaseOfFlight,
      contextSummary: raw.contextSummary,
      usefulVocabulary: raw.usefulVocabulary,
      voiceName: raw.voiceName,
      audioFilename: `${id}_${raw.callsign.replace(/[^a-zA-Z0-9]+/g, '')}.wav`,
      hasLocalAudio: false,
      fileSizeBytes: 0,
      audioStatus: 'unprepared',
    };
  });
}
