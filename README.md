# FocusGhost
## Inspiration
When our team sat down to brainstorm ideas for BroncoHacks 2026, we spent an hour doing anything _except_ brainstorming: Liam and Clarence kept their Wordle streak alive, Umar scrolled through Instagram, and Christian caught up on the news. The best hackathon projects solve problems in everyday life. And our problem was that technology had sidetracked us from coming up with a project idea in the first place.

In today's digital landscape, distractions are more pervasive than ever before. And they aren't accidental; software developers engineer algorithms optimized for your attention. We challenged ourselves to engineer something smarter. FocusGhost proves that a good productivity tool shouldn't just block distractions—it should understand **you**. By storing and adapting to user patterns over time, FocusGhost delivers a cutting-edge, customizable focus experience, all wrapped in a sleek, intuitive interface. FocusGhost is more than just a productivity app. It is your focus companion. 

## What it does
FocusGhost is a persistent AI chatbot companion designed to help users stay on task and build better focus habits over time. At the start of each session, users declare their goal—and FocusGhost holds them to it.
The app guides users through four distinct states:
1. Task Declaration: set your intention for the session
2. Active Session: stay on track with FocusGhost watching over you
3. Ghost Chat: check in with your AI companion mid-session for a gentle nudge back on track
4. Session Recap: review your performance, including session length, focus percentage, number of context switches, top distractions, and nudges received

FocusGhost is distinct from other productivity apps because of its memory. Session details and chat transcripts persist across sessions, so your ghost gets to know you and gets better at helping you focus over time.

## How we built it
| Layer | Technology |
|---|---|
| AI / Chatbot | Google AI Studio |
| Persistent Sessions | Backboard (integrated with Google AI Studio) |
| Desktop App Framework | Electron |
| Frontend | React, TypeScript, Tailwind CSS |
| Audio | ElevenLabs |

The core of FocusGhost is the integration between Google AI Studio for live chatbot sessions and Backboard for session persistence. This combination allows the app to store session metadata— title, duration, focus percentage, distraction count, and full chat transcripts—and feed that history back into future sessions so the AI can adapt its coaching style to each user.

## Challenges we ran into
### Challenge 1: OS Mix-and-Match
**The problem:** Half of our team uses Macbooks, and the other half uses Windows. This created pesky dependency mismatches, leaving Windows users with a wall of error messages. 

**The solution:** Umar and Clarence (the two Windows users) worked together to troubleshoot the errors, exploring different solutions simultaneously. Umar discovered that installing VS Build Tools resolved most of the errors, while Clarence found that updating Node.js to the latest version cleared the rest. Between these two fixes, the team was able to code in sync again. 

### Challenge 2: Architecting many Tools
**The problem:** To make our app as versatile and effective as possible, we integrated Google Gemini to power ghost chat, Backboard to support persistent chats, and ElevenLabs to support text-to-speech. 
**The solution:** Strong communication and careful planning were critical for minimizing conflicting code and safeguarding compatability.   

## Accomplishments that we're proud of
* Persistent AI memory: FocusGhost remembers each session's title, duration, focus percentage, context switches, top distractions, and nudge count, as well as the full chat transcript, letting the AI grow with the user over time
* Four-state UI flow: the natural transitions between task declaration, active session, ghost chat, and session recap make the app feel purposeful and complete
* A project born from self-awareness: building a focus app while struggling to focus ourselves gave us solidarity with our users, and that perspective guided our design decisions

## What we learned
Building FocusGhost taught us that the hardest part of creating a productivity tool isn't implementing the core features, it's personalizing those features to suite the user's needs. Making a chatbot that the user can connect to requires more storing data; it requires mindful prompting, curated session design, and a seamless UI. We also learned that cross-platform development is humbling, even with strong communication and patience. 

## What's next for FocusGhost
* AI-driven distraction thresholds: let the model learn each user's natural rhythm and set detection windows dynamically, rather than using a fixed timer
* Deeper pattern analytics: surface trends across sessions (e.g., "You focus best in the morning" or "Social media is your #1 distraction on Tuesdays")
* Cross-device sync: bring FocusGhost to mobile so the companion follows you everywhere your distractions do


