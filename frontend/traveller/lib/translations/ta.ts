import type { Translations } from "./types"

export const ta: Translations = {
  app: {
    title: "டிராவெல்லங்கா - AI பயண திட்டமிடுனர்",
    description: "AI-இயங்கும் இலங்கை பயண திட்டமிடுனர்",
    header: "டிராவெல்லங்கா",
    welcome: "வணக்கம். நான் டிராவெல்லங்கா, உங்கள் இலங்கை பயண உதவியாளர்.",
    inputPlaceholder: "செய்தியை தட்டச்சு செய்க...",
    copy: "நகலெடு",
    copied: "நகலெடுக்கப்பட்டது",
    newChat: "புதிய உரையாடல்",
    signOut: "வெளியேறு",
  },
  nav: {
    routes: "வழிகள்",
    timetable: "நேர அட்டவணை",
    plan: "திட்டம்",
    travelPlan: "பயண திட்டம்",
    allRoutes: "அனைத்து வழிகள்",
    dynamicTimetable: "நிகழ்நேர நேர அட்டவணை",
  },
  chat: {
    thinking: "சிந்திக்கிறது...",
    thought: "சிந்தித்தது",
    working: "வேலை செய்கிறது...",
    worked: "வேலை செய்தது",
    using: "பயன்படுத்துகிறது...",
    used: "பயன்படுத்தியது",
    done: "முடிந்தது",
    failed: "தோல்வி",
    input: "உள்ளீடு",
    output: "வெளியீடு",
    error: "பிழை",
    stopGeneration: "நிறுத்து",
  },
  plan: {
    title: "பயண திட்டம்",
    noPlan: "இதுவரை பயண திட்டம் இல்லை",
    noPlanHint: "உதவியாளரிடம் பயணத்தை திட்டமிட கேளுங்கள்",
    routeMap: "வழி வரைபடம்",
    confirmPlan: "திட்டத்தை உறுதிப்படுத்து",
    confirming: "உறுதிப்படுத்துகிறது...",
    planConfirmed: "திட்டம் உறுதிப்படுத்தப்பட்டது",
    planAdded: "திட்டம் உங்கள் பயண வரலாற்றில் சேர்க்கப்பட்டது",
    journeySteps: "பயண படிகள்",
    transfers: "மாற்றங்கள்",
    serviceAlerts: "சேவை எச்சரிக்கைகள்",
    planInvalid: "திட்ட தரவு முழுமையடையவில்லை அல்லது செல்லுபடியாகாது",
    parseError: "திட்ட தரவை பகுப்பாய்வு செய்ய முடியவில்லை",
    unknownRoute: "அறியப்படாத வழி: {{route}}",
    stopNotFound: "நிறுத்தத்தை கண்டுபிடிக்க முடியவில்லை: {{stop}}",
    confirmFailed: "திட்ட உறுதிப்படுத்தல் தோல்வி",
    loadRouteFailed: "வழி தரவை ஏற்ற முடியவில்லை",
  },
  realtime: {
    live: "நேரலை",
    nearbyVehicles: "அருகிலுள்ள வாகனங்கள்",
    noVehicles: "அருகில் வாகனங்கள் இல்லை",
    refreshing: "புதுப்பிக்கிறது...",
    footer: "100 கிமீ ஆரம் · ஒவ்வொரு 10 வினாடிக்கும் புதுப்பிக்கப்படுகிறது",
    next: "அடுத்து",
    min: "நிமி",
    useLocation: "என் இருப்பிடத்தை பயன்படுத்து",
    refresh: "புதுப்பி",
    failed: "தரவை பெற முடியவில்லை",
  },
  routes: {
    title: "அனைத்து வழிகள்",
    noRoutes: "வழிகள் இல்லை",
    stops: "நிறுத்தங்கள்",
  },
  timetable: {
    title: "நிகழ்நேர நேர அட்டவணை",
    selectRoute: "நேர அட்டவணையை பார்க்க ஒரு வழியை தேர்ந்தெடுக்கவும்",
    noData: "நேர அட்டவணை தரவு இல்லை",
    noDataHint: "வேறு வழியை தேர்ந்தெடுத்து பார்க்கவும்",
    backToRoutes: "வழிகளுக்கு திரும்பு",
    stops: "நிறுத்தங்கள்",
    due: "வந்தடையும்",
    seconds: "விநா",
    minutes: "நிமி",
    hours: "மணி",
    vehicle: "வாகனம் நெருங்குகிறது",
    vehicles: "வாகனங்கள் நெருங்குகின்றன",
    nextIn: "அடுத்து",
  },
  auth: {
    welcomeBack: "மீண்டும் வரவேற்கிறோம்",
    signIn: "உள்நுழைக",
    signingIn: "உள்நுழைகிறது...",
    signInTitle: "உங்கள் பயனர் கணக்கில் உள்நுழைக",
    signUp: "உங்கள் பயணங்களை திட்டமிட பதிவு செய்யவும்",
    createAccount: "கணக்கை உருவாக்கு",
    createAccountBtn: "கணக்கை உருவாக்கு",
    creatingAccount: "கணக்கை உருவாக்குகிறது...",
    register: "பதிவு செய்",
    registering: "பதிவு செய்கிறது...",
    fullName: "முழு பெயர்",
    email: "மின்னஞ்சல்",
    password: "கடவுச்சொல்",
    emailPlaceholder: "you@example.com",
    passwordPlaceholder: "உங்கள் கடவுச்சொல்லை உள்ளிடுக",
    namePlaceholder: "உங்கள் பெயர்",
    passwordMin: "குறைந்தது 6 எழுத்துகள்",
    noAccount: "கணக்கு இல்லையா?",
    haveAccount: "ஏற்கனவே கணக்கு உள்ளதா?",
    createOne: "ஒன்றை உருவாக்கு",
    signInLink: "உள்நுழைக",
    loginFailed: "உள்நுழைவு தோல்வி",
    signupFailed: "பதிவு தோல்வி",
    driverSignIn: "ஓட்டுநர் உள்நுழைவு",
    driverSignInDesc: "உங்கள் ஓட்டுநர் கணக்கில் உள்நுழைக",
    driverSignUp: "ஓட்டுநராக பதிவு செய்",
    driverSignUpDesc: "உங்கள் ஓட்டுநர் கணக்கை உருவாக்கு",
    driverEmailPlaceholder: "driver@transit.plus",
  },
  driver: {
    title: "டிரைவ்லங்கா - ஓட்டுநர் டாஷ்போர்டு",
    description: "இலங்கைக்கான நிகழ்நேர பேருந்து கண்காணிப்பு மற்றும் இடைவெளி ஆலோசனை",
    route: "வழி",
    routeProgress: "வழி முன்னேற்றம்",
    quickStats: "விரைவு புள்ளிவிவரங்கள்",
    speed: "வேகம்",
    headway: "இடைவெளி",
    headwayAhead: "இடைவெளி (முன்னால்)",
    stops: "நிறுத்தங்கள்",
    vehicles: "வாகனங்கள்",
    vehiclesTracked: "கண்காணிக்கப்பட்ட வாகனங்கள்",
    nextStopETA: "அடுத்த நிறுத்த ETA",
    headwayTrend: "இடைவெளி போக்கு",
    headwayTrendDesc: "முன்னால் உள்ள பேருந்துக்கான தூரம் (நிகழ்நேரம்)",
    routeProgressTitle: "வழி முன்னேற்றம்",
    progress: "முன்னேற்றம்",
    upcomingStops: "வரவிருக்கும் நிறுத்தங்கள்",
    noUpcomingStops: "வரவிருக்கும் நிறுத்தங்கள் இல்லை",
    advisories: "அறிவிப்புகள்",
    advisoriesDesc: "நிகழ்நேர அறிவிப்புகள்",
    noAdvisories: "அறிவிப்புகள் இல்லை",
    new: "புதியது",
    signOut: "வெளியேறு",
    live: "நேரலை",
    ahead: "முன்னால்",
    buses: "பேருந்துகள்",
    kmh: "km/h",
    km: "km",
    min: "நிமி",
    done: "முடிந்தது",
    left: "மீதமுள்ளது",
    driver: "ஓட்டுநர்",
    unknown: "தெரியாது",
    na: "N/A",
    total: "மொத்தம்",
    tracked: "கண்காணிக்கப்பட்டது",
    upcoming: "வரவிருக்கும்",
    next: "அடுத்து",
  },
  agent: {
    systemPrompt: `You are a friendly transit travel assistant for Colombo, Sri Lanka. You help travellers plan bus and train journeys.

AVAILABLE ROUTES:
- Route 138 (ID: 138): Pettah Bus Stand → Kottawa (bus, 18.6km, 9 stops)
- Route 100 (ID: 100): Pettah Bus Stand → Panadura (bus, 26km, 10 stops)
- Route 177 (ID: 177): Kollupitiya Station Rd → Kaduwela (bus, 18km, 9 stops)
- Coast Line (ID: coast-line): Colombo Fort Station → Galle Station (train, 112km, 12 stations)
- Three-wheeler connectors (short local trips)

TOOLS:
- resolve_stop: Search stops by name
- get_eta: Get vehicle ETA at a stop
- get_fare / get_route: Get journey info between two stops on a route
- get_service_alerts: Check advisories
- present_plan: Show the final plan (call this LAST)

IMPORTANT - INFO GATHERING:
When a user asks to plan a trip, you MUST collect ALL of these before presenting a plan:
1. Where are they starting from? (which stop/area)
2. Where do they want to go? (which stop/area)
3. When do they want to travel? (optional but helpful)
4. How do they want to travel? (bus/train/three-wheeler)

If the user gives a vague query like "plan a trip" or "help me get somewhere", DO NOT guess. Ask specific clarifying questions to get the missing information. For example:
- "Where are you starting from?"
- "Where would you like to go?"
- "Would you like to travel by bus, train, or three-wheeler?"

Use resolve_stop to look up stop names the user mentions, then use get_eta/get_fare/get_route with the actual stop IDs and route IDs.

After gathering all data, call present_plan with the complete plan. Include accurate route names, stop names, duration, fare breakdown, steps, and any relevant alerts. Do NOT write out the plan in text after calling present_plan.`,
    retrying: (attempt: number, max: number) => `\n_மீண்டும் முயற்சிக்கிறது... (முயற்சி ${attempt}/${max})_\n`,
    truncated: "\n\n_பதில் துண்டிக்கப்பட்டது. மேலும் விவரங்களுக்கு மீண்டும் கேளுங்கள்._",
    maxRounds: (rounds: number) => `அதிகபட்ச ${rounds} சிந்தனை சுற்றுகளை அடைந்தது. புதிய திட்டத்திற்கு புதிய உரையாடலை தொடங்கவும்.`,
    llmFailed: (attempts: number, error: string) => `${attempts} முயற்சிகளுக்கு பின் LLM கோரிக்கை தோல்வி: ${error}`,
    streamError: (msg: string) => `ஸ்ட்ரீம் குறுக்கிடப்பட்டது: ${msg}`,
    toolTimeout: (name: string, ms: number) => `'${name}' கருவி ${ms}ms இல் நேரம் முடிந்தது`,
    toolFailed: "கருவி செயல்படுத்தல் தோல்வி",
  },
  tools: {
    resolve_stop: {
      description: "Search for a transit stop by name across all routes (Route 138, Route 100, Route 177, Coast Line train, three-wheeler connectors). Returns matching stops with their IDs, route info, and coordinates.",
      query_description: "The stop name or part of name to search for",
    },
    get_eta: {
      description: "Get estimated arrival times for the next vehicles approaching a specific stop on a specific route.",
      route_id_description: "Route ID (e.g., '138', '100', '177', 'coast-line')",
      stop_id_description: "Stop ID (e.g., '138-01' for Pettah on Route 138)",
    },
    get_fare: {
      description: "Get fare information between two stops on a specific route. Returns fare breakdown by service type (Normal, Semi-Luxury, Luxury, Super Luxury, Three-Wheeler).",
    },
    get_route: {
      description: "Get a suggested journey from origin to destination on a specific route. Returns distance, vehicles approaching, and fare info.",
    },
    get_service_alerts: {
      description: "Get current service advisories and alerts for a specific route. If no route_id is specified, returns all alerts.",
      route_id_description: "Optional route ID to filter alerts",
    },
    present_plan: {
      description: "Present the final complete travel plan to the user. Call this as the LAST step with all gathered information. Include real route names, stop names, accurate duration, and fare from the data you collected. The plan will be rendered beautifully.",
      from_stop: "Departure stop name",
      to_stop: "Destination stop name",
      route: "Primary route name (e.g. 'Route 138', 'Coast Line')",
      duration_minutes: "Estimated total travel time in minutes",
      fare: "Cost of the trip, e.g. 'LKR 228'",
      depart_at: "Recommended departure time or next vehicle time",
      arrive_at: "Estimated arrival time",
      transfers: "Transfer points along the route",
      steps: "Step-by-step journey instructions",
      alerts: "Relevant service alerts",
    },
  },
  common: {
    noRouteData: "வழி தரவு இல்லை",
    couldNotParse: "பயண திட்ட தரவை பகுப்பாய்வு செய்ய முடியவில்லை.",
    noActiveAdvisories: "இந்த வழிக்கு செயலில் அறிவிப்புகள் இல்லை",
    requestTimedOut: "கோரிக்கை நேரம் முடிந்தது",
    networkFailed: "பிணைய கோரிக்கை தோல்வி",
  },
}
