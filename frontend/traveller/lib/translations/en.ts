export const en = {
  app: {
    title: "TravelLanka - AI Travel Planner",
    description: "AI-powered travel planner for Sri Lanka",
    header: "TravelLanka",
    welcome: "Hey there. I'm TravelLanka, your Sri Lanka travel assistant.",
    inputPlaceholder: "Type a message...",
    copy: "Copy",
    copied: "Copied",
    newChat: "New Chat",
    signOut: "Sign out",
  },
  nav: {
    routes: "Routes",
    timetable: "Timetable",
    plan: "Plan",
    travelPlan: "Travel Plan",
    allRoutes: "All Routes",
    dynamicTimetable: "Dynamic Timetable",
  },
  chat: {
    thinking: "Thinking...",
    thought: "Thought",
    working: "Working...",
    worked: "Worked",
    using: "Using...",
    used: "Used",
    done: "Done",
    failed: "Failed",
    input: "Input",
    output: "Output",
    error: "Error",
    stopGeneration: "Stop",
  },
  plan: {
    title: "Travel Plan",
    noPlan: "No travel plan yet",
    noPlanHint: "Ask the assistant to plan a journey",
    routeMap: "Route Map",
    confirmPlan: "Confirm Plan",
    confirming: "Confirming...",
    planConfirmed: "Plan Confirmed",
    planAdded: "Plan added to your travel history",
    journeySteps: "Journey Steps",
    transfers: "Transfers",
    serviceAlerts: "Service Alerts",
    planInvalid: "Plan data is incomplete or invalid",
    parseError: "Failed to parse plan data",
    unknownRoute: "Unknown route: {{route}}",
    stopNotFound: "Could not find stop: {{stop}}",
    confirmFailed: "Plan confirmation failed",
    loadRouteFailed: "Failed to load route data",
  },
  realtime: {
    live: "Live",
    nearbyVehicles: "Nearby Vehicles",
    noVehicles: "No vehicles nearby",
    refreshing: "Refreshing...",
    footer: "100km radius · Updates every 10s",
    next: "Next",
    min: "min",
    useLocation: "Use my location",
    refresh: "Refresh",
    failed: "Failed to fetch",
  },
  routes: {
    title: "All Routes",
    noRoutes: "No routes available",
    stops: "stops",
  },
  timetable: {
    title: "Dynamic Timetable",
    selectRoute: "Select a route to view timetable",
    noData: "No timetable data",
    noDataHint: "Try selecting a different route",
    backToRoutes: "Back to routes",
    stops: "stops",
    due: "Due",
    seconds: "s",
    minutes: "m",
    hours: "h",
    vehicle: "vehicle approaching",
    vehicles: "vehicles approaching",
    nextIn: "Next in",
  },
  auth: {
    welcomeBack: "Welcome back",
    signIn: "Sign in",
    signingIn: "Signing in...",
    signInTitle: "Sign in to your traveller account",
    signUp: "Sign up to start planning your journeys",
    createAccount: "Create an account",
    createAccountBtn: "Create account",
    creatingAccount: "Creating account...",
    register: "Register",
    registering: "Registering...",
    fullName: "Full Name",
    email: "Email",
    password: "Password",
    emailPlaceholder: "you@example.com",
    passwordPlaceholder: "Enter your password",
    namePlaceholder: "John Doe",
    passwordMin: "At least 6 characters",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",
    createOne: "Create one",
    signInLink: "Sign in",
    loginFailed: "Login failed",
    signupFailed: "Signup failed",
    driverSignIn: "Driver sign in",
    driverSignInDesc: "Sign in to your driver account",
    driverSignUp: "Register as driver",
    driverSignUpDesc: "Create your driver account",
    driverEmailPlaceholder: "driver@transit.plus",
  },
  driver: {
    title: "DriveLanka - Driver Dashboard",
    description: "Real-time bus tracking & headway advisory for Sri Lanka",
    route: "Route",
    routeProgress: "Route Progress",
    quickStats: "Quick Stats",
    speed: "Speed",
    headway: "Headway",
    headwayAhead: "Headway (Ahead)",
    stops: "Stops",
    vehicles: "Vehicles",
    vehiclesTracked: "Vehicles Tracked",
    nextStopETA: "Next Stop ETA",
    headwayTrend: "Headway Trend",
    headwayTrendDesc: "Distance to bus ahead (real-time)",
    routeProgressTitle: "Route Progress",
    progress: "Progress",
    upcomingStops: "Upcoming Stops",
    noUpcomingStops: "No upcoming stops",
    advisories: "Advisories",
    advisoriesDesc: "Real-time advisories",
    noAdvisories: "No advisories",
    new: "NEW",
    signOut: "Sign out",
    live: "Live",
    ahead: "ahead",
    buses: "buses",
    kmh: "km/h",
    km: "km",
    min: "min",
    done: "done",
    left: "left",
    driver: "Driver",
    unknown: "Unknown",
    na: "N/A",
    total: "total",
    tracked: "tracked",
    upcoming: "upcoming",
    next: "next",
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
    retrying: (attempt: number, max: number) => `\n_Retrying... (attempt ${attempt}/${max})_\n`,
    truncated: "\n\n_Response was truncated. Please ask again for more details._",
    maxRounds: (rounds: number) => `Reached maximum of ${rounds} reasoning rounds. Please start a new chat for a fresh plan.`,
    llmFailed: (attempts: number, error: string) => `LLM request failed after ${attempts} attempts: ${error}`,
    streamError: (msg: string) => `Stream interrupted: ${msg}`,
    toolTimeout: (name: string, ms: number) => `Tool '${name}' timed out after ${ms}ms`,
    toolFailed: "Tool execution failed",
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
    noRouteData: "No route data available",
    couldNotParse: "Could not parse travel plan data.",
    noActiveAdvisories: "No active advisories for this route",
    requestTimedOut: "Request timed out",
    networkFailed: "Network request failed",
  },
}
