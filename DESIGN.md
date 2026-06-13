Polling In Run - Design.md
Project Overview
Polling In Run is a mobile-first running assistant web application.

The service helps runners quickly find nearby public restrooms and water fountains while running, and allows them to save their running records and personal notes.

The primary goal is not traditional fitness tracking, but providing essential convenience information during the run.

While planning this project, I realized that while executing a perfect run is important, providing necessary convenience information before, during, and after the run is even more critical for the runner's actual experience.

Design Principles
Mobile First
The application is primarily designed and optimized for mobile devices.

Map First
The map view is the most critical and dominant UI element.

Fast Action
Users must be able to start their run within a few seconds of launching the app.

Minimal Interaction
Reduce unnecessary screen transitions, navigation depth, and user input fields.

UX Rules
Mobile First

Korean and English support

Minimize navigation depth (Keep a flat architecture)

Map-centered UI

Bottom Navigation Bar

Simple and clear information hierarchy

Running-focused interaction pattern

Information Priority
Current Location

Nearby Water Fountains

Nearby Public Restrooms

Running Start Button

Running Records (History)

User Flow
Launch App

↓

Home Map Screen

↓

Check Nearby Facilities

↓

Start Running

↓

Running Mode (Active Tracking)

↓

Stop Running

↓

Save Running Record & Notes

↓

Return to Home Map Screen

Information Architecture
Home
├─ Map (Full-Screen)
├─ Current Location Marker
├─ Water Fountain Markers
├─ Restroom Markers
└─ Start Running Button

Records
├─ Record List
└─ Record Detail View

My Page
├─ Login / Authentication
├─ User Profile
└─ Settings

Bottom Navigation

Home

Records

My

Screen Definition
Home
Purpose: Explore nearby convenience facilities and initiate a run instantly.

Components:

Full-screen interactive map

Current location marker (with real-time GPS pulsing)

Water fountain markers

Public restroom markers

Large, high-visibility Start Running button

Bottom Navigation Bar

Running (Active Mode)
Purpose: Monitor current running status with zero distraction.

Components:

Map view (Centered on user)

Running distance (KM)

Running duration (Time elapsed)

Pause button

Stop/Finish button

Running Result
Purpose: Review and save the completed run data with personal memories.

Components:

Running statistics summary

Memo/Note input field

Photo upload zone

Save/Submit button

Records (History)
Purpose: Browse and look back at previous running logs.

Components:

Grid/List of record cards

Distance and Duration metrics per card

Date of the run

My Page
Purpose: Manage user account configurations.

Components:

Login / Logout container

Profile management

App Settings (Language toggle, etc.)

Visual Style
Keywords:

Modern

Clean

Lightweight

Outdoor Activity

Running Lifestyle

Mobile Native App Feel

Reference Styles:

Kakao Maps

Naver Maps

Google Maps

Brand Colors:

Blue: For water fountains and active status tracking

Black: For high-contrast layout, text, and outdoor visibility

White: For clean card backgrounds and core interface layers

Constraints
Avoid:

Complex and data-heavy dashboard structures

Multi-level or deep nested navigation menus

Desktop-oriented desktop layouts

Excessive or heavy visual effects/animations

Social and community features (Feeds, rankings, friends)