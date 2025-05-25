# TarotForge Modules Documentation

## Overview

This directory contains comprehensive documentation for all major modules and systems within TarotForge. Each module is organized with its own folder containing architecture documentation, implementation guides, and technical references.

## Module Structure

Each module follows a consistent documentation structure:
- **README.md** - Module overview and quick start guide
- **Architecture documentation** - System design and patterns
- **Implementation guide** - Developer integration instructions
- **Technical references** - Database schemas, APIs, and utilities

## Available Modules

### 🤝 [Host/Guest System](./host-guest-system/)
**Collaborative session management with role-based access control**

Core functionality for managing collaborative tarot reading sessions with proper host/participant distinction, invite link sharing, and real-time synchronization.

**Key Features:**
- Role-based access control (hosts vs participants)
- Wrapper invite link system for proper role assignment
- Real-time session state synchronization
- Anonymous guest support with browser fingerprinting
- Offline mode with automatic sync
- Progress preservation and conflict resolution

**Documentation:**
- [📋 Architecture Overview](./host-guest-system/host-guest-architecture.md)
- [🛠️ Implementation Guide](./host-guest-system/invite-system-implementation.md)
- [🗄️ Database Schema Reference](./host-guest-system/database-schema-reference.md)

### 📹 [Video System](./video-system/)
**Multi-party video calling for collaborative sessions**

Provides real-time video communication capabilities integrated with TarotForge's collaborative reading sessions, enabling seamless video calls between hosts and participants.

**Key Features:**
- Multi-party video calls with WebRTC
- Session integration and auto-synchronization
- Comprehensive UI controls and mobile optimization
- Real-time communication and stream management

**Documentation:**
- [📋 Multi-party Video Implementation](./video-system/multi-party-video-implementation.md)
- [🔄 Video Call Auto-synchronization](./video-system/video-call-auto-synchronization.md)
- [🎯 Video Call Interaction Flows](./video-system/video-call-interaction-flows.md)
- [🧪 Video Call Testing Guide](./video-system/video-call-testing-guide.md)
- [🎨 Video Call UI Interactions](./video-system/video-call-ui-interactions.md)

### 🔄 [UI Synchronization](./ui-synchronization/)
**Real-time UI state synchronization across participants**

Handles synchronization of user interface states across multiple participants in collaborative sessions, ensuring consistent views and interactions for all users.

**Key Features:**
- Modal state synchronization across participants
- Pan & focus coordination for shared views
- Real-time participant notifications
- Conflict resolution for simultaneous interactions

**Documentation:**
- [🔄 Modal Synchronization Testing](./ui-synchronization/modal-synchronization-testing.md)
- [🎯 Pan & Focus Synchronization](./ui-synchronization/pan-focus-synchronization.md)
- [🔔 Participant Notifications](./ui-synchronization/participant-notifications.md)

### 🧭 [Navigation System](./navigation-system/)
**User navigation flows and identification**

Manages user navigation patterns, reading room access, and persistent user identification across TarotForge, ensuring proper routing and seamless user experiences.

**Key Features:**
- Optimized reading room navigation flows
- Persistent user identification with browser fingerprinting
- Smart routing based on user context
- Session continuity across navigation

**Documentation:**
- [🧭 Reading Room Navigation](./navigation-system/reading-room-navigation.md)
- [👤 User Identification System](./navigation-system/user-identification-system.md)

---

## Future Modules

### 🎴 Card Management System
*Coming Soon*
- Deck creation and management
- Card image processing and storage
- Metadata and keyword systems

### 🔮 AI Interpretation Engine
*Coming Soon*
- AI-powered tarot interpretations
- Context-aware reading generation
- Personalization and learning

### 💳 Payment & Subscription System
*Coming Soon*
- Stripe integration
- Subscription management
- Marketplace transactions

### 📱 Mobile & PWA Features
*Coming Soon*
- Progressive Web App capabilities
- Mobile-specific optimizations
- Offline functionality

### 🎨 Theme & Customization System
*Coming Soon*
- Custom themes and layouts
- User interface personalization
- Accessibility features

## Documentation Standards

### File Naming Conventions
- `README.md` - Module overview and index
- `{module-name}-architecture.md` - System architecture and design
- `{module-name}-implementation.md` - Developer implementation guide
- `{module-name}-reference.md` - Technical reference (API, schema, etc.)

### Content Structure
1. **Overview** - Brief description and key features
2. **Architecture** - System design and component relationships
3. **Implementation** - Code examples and integration patterns
4. **Reference** - Technical specifications and APIs
5. **Testing** - Test strategies and examples
6. **Troubleshooting** - Common issues and solutions

### Code Examples
- Include complete, runnable examples
- Show both TypeScript and JavaScript where applicable
- Provide error handling patterns
- Include performance considerations

## Contributing to Documentation

### Adding New Modules
1. Create module folder: `docs/modules/{module-name}/`
2. Add README.md with module overview
3. Include architecture, implementation, and reference docs
4. Update this main modules index

### Updating Existing Modules
1. Follow existing structure and naming conventions
2. Update version history in module README
3. Ensure all code examples are current
4. Test all links and references

### Documentation Review Process
1. Technical accuracy review
2. Code example validation
3. Link and reference verification
4. Accessibility and readability check

## Quick Navigation

### By Category
- **Core Systems**: [Host/Guest System](./host-guest-system/), [Navigation System](./navigation-system/)
- **Communication**: [Video System](./video-system/)
- **Synchronization**: [UI Synchronization](./ui-synchronization/)
- **Content Management**: *Coming Soon*
- **AI & ML**: *Coming Soon*
- **Payment & Commerce**: *Coming Soon*
- **Mobile & PWA**: *Coming Soon*
- **UI & Theming**: *Coming Soon*

### By Audience
- **Developers**: Implementation guides and technical references
- **Architects**: Architecture overviews and system design
- **DevOps**: Database schemas and deployment guides
- **QA**: Testing strategies and troubleshooting guides

## Support

For questions about module documentation:
1. Check the specific module's troubleshooting section
2. Review implementation examples
3. Consult the technical reference
4. Open an issue with the `documentation` label

---

This modular documentation structure ensures comprehensive coverage of TarotForge's systems while maintaining clarity and ease of navigation for developers, architects, and other stakeholders. 