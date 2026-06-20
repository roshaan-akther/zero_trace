export interface Translations {
  app: {
    title: string
    description: string
    header: string
    welcome: string
    inputPlaceholder: string
    copy: string
    copied: string
    newChat: string
    signOut: string
  }
  nav: {
    routes: string
    timetable: string
    plan: string
    travelPlan: string
    allRoutes: string
    dynamicTimetable: string
  }
  chat: {
    thinking: string
    thought: string
    working: string
    worked: string
    using: string
    used: string
    done: string
    failed: string
    input: string
    output: string
    error: string
    stopGeneration: string
  }
  plan: {
    title: string
    noPlan: string
    noPlanHint: string
    routeMap: string
    confirmPlan: string
    confirming: string
    planConfirmed: string
    planAdded: string
    journeySteps: string
    transfers: string
    serviceAlerts: string
    planInvalid: string
    parseError: string
    unknownRoute: string
    stopNotFound: string
    confirmFailed: string
    loadRouteFailed: string
  }
  realtime: {
    live: string
    nearbyVehicles: string
    noVehicles: string
    refreshing: string
    footer: string
    next: string
    min: string
    useLocation: string
    refresh: string
    failed: string
  }
  routes: {
    title: string
    noRoutes: string
    stops: string
  }
  timetable: {
    title: string
    selectRoute: string
    noData: string
    noDataHint: string
    backToRoutes: string
    stops: string
    due: string
    seconds: string
    minutes: string
    hours: string
    vehicle: string
    vehicles: string
    nextIn: string
  }
  auth: {
    welcomeBack: string
    signIn: string
    signingIn: string
    signInTitle: string
    signUp: string
    createAccount: string
    createAccountBtn: string
    creatingAccount: string
    register: string
    registering: string
    fullName: string
    email: string
    password: string
    emailPlaceholder: string
    passwordPlaceholder: string
    namePlaceholder: string
    passwordMin: string
    noAccount: string
    haveAccount: string
    createOne: string
    signInLink: string
    loginFailed: string
    signupFailed: string
    driverSignIn: string
    driverSignInDesc: string
    driverSignUp: string
    driverSignUpDesc: string
    driverEmailPlaceholder: string
  }
  driver: {
    title: string
    description: string
    route: string
    routeProgress: string
    quickStats: string
    speed: string
    headway: string
    headwayAhead: string
    stops: string
    vehicles: string
    vehiclesTracked: string
    nextStopETA: string
    headwayTrend: string
    headwayTrendDesc: string
    routeProgressTitle: string
    progress: string
    upcomingStops: string
    noUpcomingStops: string
    advisories: string
    advisoriesDesc: string
    noAdvisories: string
    new: string
    signOut: string
    live: string
    ahead: string
    buses: string
    kmh: string
    km: string
    min: string
    done: string
    left: string
    driver: string
    unknown: string
    na: string
    total: string
    tracked: string
    upcoming: string
    next: string
  }
  agent: {
    systemPrompt: string
    retrying: (attempt: number, max: number) => string
    truncated: string
    maxRounds: (rounds: number) => string
    llmFailed: (attempts: number, error: string) => string
    streamError: (msg: string) => string
    toolTimeout: (name: string, ms: number) => string
    toolFailed: string
  }
  tools: {
    resolve_stop: {
      description: string
      query_description: string
    }
    get_eta: {
      description: string
      route_id_description: string
      stop_id_description: string
    }
    get_fare: {
      description: string
    }
    get_route: {
      description: string
    }
    get_service_alerts: {
      description: string
      route_id_description: string
    }
    present_plan: {
      description: string
      from_stop: string
      to_stop: string
      route: string
      duration_minutes: string
      fare: string
      depart_at: string
      arrive_at: string
      transfers: string
      steps: string
      alerts: string
    }
  }
  common: {
    noRouteData: string
    couldNotParse: string
    noActiveAdvisories: string
    requestTimedOut: string
    networkFailed: string
  }
}
