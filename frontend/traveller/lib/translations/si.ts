import type { Translations } from "./types"

export const si: Translations = {
  app: {
    title: "ට්‍රැවල්ලංකා - AI ගමන් සැලසුම්කරු",
    description: "AI බලයෙන් ක්‍රියාත්මක ශ්‍රී ලංකා ගමන් සැලසුම්කරු",
    header: "ට්‍රැවල්ලංකා",
    welcome: "ආයුබෝවන්. මම ට්‍රැවල්ලංකා, ඔබේ ශ්‍රී ලංකා ගමන් සහායකයි.",
    inputPlaceholder: "පණිවිඩයක් ටයිප් කරන්න...",
    copy: "පිටපත් කරන්න",
    copied: "පිටපත් කළා",
    newChat: "නව සංවාදය",
    signOut: "පිටවීම",
  },
  nav: {
    routes: "මාර්ග",
    timetable: "කාලසටහන",
    plan: "සැලැස්ම",
    travelPlan: "ගමන් සැලැස්ම",
    allRoutes: "සියලු මාර්ග",
    dynamicTimetable: "සජීවී කාලසටහන",
  },
  chat: {
    thinking: "සිතමින්...",
    thought: "සිතුවා",
    working: "ක්‍රියා කරමින්...",
    worked: "ක්‍රියා කළා",
    using: "භාවිතා කරමින්...",
    used: "භාවිතා කළා",
    done: "අවසන්",
    failed: "අසාර්ථකයි",
    input: "ආදානය",
    output: "ප්‍රතිදානය",
    error: "දෝෂය",
    stopGeneration: "නවත්වන්න",
  },
  plan: {
    title: "ගමන් සැලැස්ම",
    noPlan: "තවම ගමන් සැලැස්මක් නැත",
    noPlanHint: "සහායකගෙන් ගමනක් සැලසුම් කරන ලෙස අසන්න",
    routeMap: "මාර්ග සිතියම",
    confirmPlan: "සැලැස්ම තහවුරු කරන්න",
    confirming: "තහවුරු කරමින්...",
    planConfirmed: "සැලැස්ම තහවුරු කළා",
    planAdded: "සැලැස්ම ඔබේ ගමන් ඉතිහාසයට එක් කළා",
    journeySteps: "ගමන් පියවර",
    transfers: "මාරුවීම්",
    serviceAlerts: "සේවා දැනුම්දීම්",
    planInvalid: "සැලැස්මේ දත්ත අසම්පූර්ණයි හෝ වලංගු නැත",
    parseError: "සැලැස්මේ දත්ත විග්‍රහ කිරීමට අපොහොසත්",
    unknownRoute: "නොදන්නා මාර්ගය: {{route}}",
    stopNotFound: "නැවතුම සොයාගත නොහැක: {{stop}}",
    confirmFailed: "සැලැස්ම තහවුරු කිරීම අසාර්ථකයි",
    loadRouteFailed: "මාර්ග දත්ත පූරණය කිරීමට අපොහොසත්",
  },
  realtime: {
    live: "සජීවී",
    nearbyVehicles: "ආසන්න වාහන",
    noVehicles: "ආසන්න වාහන නැත",
    refreshing: "නැවුම් කරමින්...",
    footer: "කිලෝමීටර 100 ක අරය · තත්පර 10 කට වරක් යාවත්කාලීන වේ",
    next: "ඊළඟ",
    min: "මිනි",
    useLocation: "මගේ ස්ථානය භාවිතා කරන්න",
    refresh: "නැවුම් කරන්න",
    failed: "දත්ත ලබාගැනීමට අපොහොසත්",
  },
  routes: {
    title: "සියලු මාර්ග",
    noRoutes: "මාර්ග නැත",
    stops: "නැවතුම්",
  },
  timetable: {
    title: "සජීවී කාලසටහන",
    selectRoute: "කාලසටහන බැලීමට මාර්ගයක් තෝරන්න",
    noData: "කාලසටහන් දත්ත නැත",
    noDataHint: "වෙනත් මාර්ගයක් තෝරා බලන්න",
    backToRoutes: "මාර්ග වෙත ආපසු",
    stops: "නැවතුම්",
    due: "පැමිණෙන",
    seconds: "තත්",
    minutes: "මිනි",
    hours: "පැය",
    vehicle: "වාහනය ළඟා වෙමින්",
    vehicles: "වාහන ළඟා වෙමින්",
    nextIn: "ඊළඟ",
  },
  auth: {
    welcomeBack: "ආයුබෝවන්",
    signIn: "පිවිසෙන්න",
    signingIn: "පිවිසෙමින්...",
    signInTitle: "ඔබේ සංචාරක ගිණුමට පිවිසෙන්න",
    signUp: "ඔබේ ගමන් සැලසුම් කිරීම ආරම්භ කිරීමට ලියාපදිංචි වන්න",
    createAccount: "ගිණුමක් සාදන්න",
    createAccountBtn: "ගිණුම සාදන්න",
    creatingAccount: "ගිණුම සාදමින්...",
    register: "ලියාපදිංචි වන්න",
    registering: "ලියාපදිංචි වෙමින්...",
    fullName: "සම්පූර්ණ නම",
    email: "ඊමේල්",
    password: "මුරපදය",
    emailPlaceholder: "you@example.com",
    passwordPlaceholder: "ඔබේ මුරපදය ඇතුළත් කරන්න",
    namePlaceholder: "ඔබේ නම",
    passwordMin: "අවම වශයෙන් අක්ෂර 6 ක්",
    noAccount: "ගිණුමක් නැද්ද?",
    haveAccount: "දැනටමත් ගිණුමක් තිබේද?",
    createOne: "එකක් සාදන්න",
    signInLink: "පිවිසෙන්න",
    loginFailed: "පිවිසීම අසාර්ථකයි",
    signupFailed: "ලියාපදිංචිය අසාර්ථකයි",
    driverSignIn: "රියදුරු පිවිසුම",
    driverSignInDesc: "ඔබේ රියදුරු ගිණුමට පිවිසෙන්න",
    driverSignUp: "රියදුරු ලෙස ලියාපදිංචි වන්න",
    driverSignUpDesc: "ඔබේ රියදුරු ගිණුම සාදන්න",
    driverEmailPlaceholder: "driver@transit.plus",
  },
  driver: {
    title: "ඩ්‍රයිව්ලංකා - රියදුරු පුවරුව",
    description: "ශ්‍රී ලංකාව සඳහා සජීවී බස් ලුහුබැඳීම සහ හිස් ගැප් උපදේශනය",
    route: "මාර්ගය",
    routeProgress: "මාර්ග ප්‍රගතිය",
    quickStats: "ඉක්මන් සංඛ්‍යා",
    speed: "වේගය",
    headway: "හිස් ගැප්",
    headwayAhead: "හිස් ගැප් (ඉදිරියෙන්)",
    stops: "නැවතුම්",
    vehicles: "වාහන",
    vehiclesTracked: "නිරීක්ෂණය කළ වාහන",
    nextStopETA: "ඊළඟ නැවතුම ETA",
    headwayTrend: "හිස් ගැප් ප්‍රවණතාව",
    headwayTrendDesc: "ඉදිරි බස් රථයට ඇති දුර (සජීවී)",
    routeProgressTitle: "මාර්ග ප්‍රගතිය",
    progress: "ප්‍රගතිය",
    upcomingStops: "ඉදිරි නැවතුම්",
    noUpcomingStops: "ඉදිරි නැවතුම් නැත",
    advisories: "දැනුම්දීම්",
    advisoriesDesc: "සජීවී දැනුම්දීම්",
    noAdvisories: "දැනුම්දීම් නැත",
    new: "අළුත්",
    signOut: "පිටවීම",
    live: "සජීවී",
    ahead: "ඉදිරියෙන්",
    buses: "බස්",
    kmh: "km/h",
    km: "km",
    min: "මිනි",
    done: "අවසන්",
    left: "ඉතිරිය",
    driver: "රියදුරු",
    unknown: "නොදනී",
    na: "N/A",
    total: "මුළු",
    tracked: "නිරීක්ෂණය",
    upcoming: "ඉදිරි",
    next: "ඊළඟ",
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
    retrying: (attempt: number, max: number) => `\n_නැවත උත්සාහ කරමින්... (උත්සාහය ${attempt}/${max})_\n`,
    truncated: "\n\n_ප්‍රතිචාරය කපා හැර ඇත. කරුණාකර වැඩි විස්තර සඳහා නැවත අසන්න._",
    maxRounds: (rounds: number) => `උපරිම තර්ක වට ${rounds} ක් කරා ළඟා විය. නව සැලැස්මක් සඳහා නව සංවාදයක් ආරම්භ කරන්න.`,
    llmFailed: (attempts: number, error: string) => `උත්සාහ ${attempts} කින් පසු LLM ඉල්ලීම අසාර්ථකයි: ${error}`,
    streamError: (msg: string) => `ප්‍රවාහයට බාධා: ${msg}`,
    toolTimeout: (name: string, ms: number) => `'${name}' මෙවලම ${ms}ms කින් කාලය ඉක්මවා ගියේය`,
    toolFailed: "මෙවලම ක්‍රියාත්මක කිරීම අසාර්ථකයි",
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
    noRouteData: "මාර්ග දත්ත නැත",
    couldNotParse: "ගමන් සැලසුම් දත්ත විග්‍රහ කළ නොහැක.",
    noActiveAdvisories: "මෙම මාර්ගය සඳහා සක්‍රීය දැනුම්දීම් නැත",
    requestTimedOut: "ඉල්ලීම කාලය ඉක්මවා ගියේය",
    networkFailed: "ජාල ඉල්ලීම අසාර්ථකයි",
  },
}
