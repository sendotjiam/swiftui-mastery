# SwiftUI State Management

## SwiftUI State and Observation

### [Beginner] What is `@State`?
**Interview answer:**  
`@State` is local, view-owned mutable state managed by SwiftUI. Use it for simple state that belongs to a specific view.

**Deep explanation:**  
Because views are structs and recreated often, ordinary stored properties do not persist as mutable UI state. `@State` stores the value in SwiftUI-managed storage keyed by view identity.

**Why it matters:**  
It is the basic source of truth for local UI state like toggles, selected tabs, text input, and expansion flags.

**How it works:**  
SwiftUI keeps storage outside the transient view struct. Mutating the state invalidates the view and recomputes body.

**Use cases:**  
Form fields, selected segment, local presentation booleans, temporary UI flags, and animation state.

**Common mistakes:**  
Using `@State` for data owned by a parent or shared model. Initializing `@State` from changing input and expecting it to stay synced automatically.

**Best practices:**  
Keep `@State` private. Lift state up when multiple views need to coordinate.

**Red flag answers:**  
"@State is just a stored property." It is framework-managed persistent storage.

**Code example:**  
```swift
struct SettingsToggle: View {
    @State private var isEnabled = false

    var body: some View {
        Toggle("Enable notifications", isOn: $isEnabled)
    }
}
```

**Possible follow-up questions:**  
Where is `@State` stored? What happens when view identity changes?

### [Beginner] What is `@Binding`?
**Interview answer:**  
`@Binding` is a two-way connection to state owned elsewhere. It lets a child read and write a parent's source of truth without owning it.

**Deep explanation:**  
Bindings avoid duplicating state. A child can edit a value, but ownership remains with the parent or model that supplied the binding.

**Why it matters:**  
It is fundamental for forms, reusable controls, sheets, and child components.

**How it works:**  
A binding wraps getter and setter closures. `$state` produces a binding to a `@State` value.

**Use cases:**  
Text fields, toggles, custom controls, selection, sheet booleans, and edit screens.

**Common mistakes:**  
Creating local copies of parent state instead of binding. Passing binding too deeply where explicit actions would be clearer.

**Best practices:**  
Use bindings for direct child editing. Use callbacks or view models for complex business actions.

**Red flag answers:**  
"Binding owns the value." It points to someone else's source of truth.

**Code example:**  
```swift
struct FavoriteToggle: View {
    @Binding var isFavorite: Bool

    var body: some View {
        Toggle("Favorite", isOn: $isFavorite)
    }
}
```

**Possible follow-up questions:**  
How do you create a custom binding? When is binding overused?

### [Intermediate] What are `@Observable` and `@Bindable`?
**Interview answer:**  
`@Observable` marks a reference type as observable using Swift's Observation framework. `@Bindable` creates bindings to properties of an observable model, commonly for form controls.

**Deep explanation:**  
Observation is the modern iOS 17+ replacement for many `ObservableObject` use cases. It tracks property access so SwiftUI can update views that read changed properties.

**Why it matters:**  
It reduces boilerplate and can provide more precise invalidation than `ObservableObject` with broad `objectWillChange`.

**How it works:**  
The `@Observable` macro expands the type with observation tracking. SwiftUI records observed property reads during body evaluation. `@Bindable` exposes mutable bindings to observable properties.

**Use cases:**  
View models, form models, settings models, app state objects, and feature state.

**Common mistakes:**  
Using `@StateObject` with `@Observable` models unnecessarily. Forgetting iOS 17 minimum. Making every service observable.

**Best practices:**  
For iOS 17+ SwiftUI, prefer `@Observable` for UI models. Use `@State` to own an observable model in a view.

**Red flag answers:**  
"@Observable is just ObservableObject renamed." It uses a different Observation system and does not require `@Published`.

**Code example:**  
```swift
@Observable
final class ProfileForm {
    var name = ""
    var email = ""
}

struct ProfileFormView: View {
    @State private var form = ProfileForm()

    var body: some View {
        @Bindable var form = form

        Form {
            TextField("Name", text: $form.name)
            TextField("Email", text: $form.email)
        }
    }
}
```

**Possible follow-up questions:**  
How does Observation differ from Combine? When would you still use `ObservableObject`?

### [Intermediate] What are `@StateObject` and `@ObservedObject`?
**Interview answer:**  
`@StateObject` creates and owns an `ObservableObject` for a view's lifetime. `@ObservedObject` observes an object owned elsewhere.

**Deep explanation:**  
With Combine-era SwiftUI, object ownership matters. If a view creates an observable object with `@ObservedObject`, SwiftUI may recreate it when the view struct is recreated. `@StateObject` preserves it for the view identity.

**Why it matters:**  
Wrong ownership causes lost state, duplicate network calls, and unstable view models.

**How it works:**  
`@StateObject` stores the object in SwiftUI-managed storage. `@ObservedObject` subscribes to an external object's `objectWillChange`.

**Use cases:**  
`@StateObject`: view-owned view model. `@ObservedObject`: object passed from parent/coordinator.

**Common mistakes:**  
Using `@ObservedObject var vm = ViewModel()` in a view. Passing `@StateObject` into child views instead of `@ObservedObject`.

**Best practices:**  
Own once with `@StateObject`, observe elsewhere with `@ObservedObject`. For iOS 17+ Observation, prefer `@State` with `@Observable` models.

**Red flag answers:**  
"They are basically the same." Observation and ownership behavior differ.

**Code example:**  
```swift
final class LegacyProfileViewModel: ObservableObject {
    @Published var name = ""
}

struct ProfileScreen: View {
    @StateObject private var viewModel = LegacyProfileViewModel()

    var body: some View {
        ProfileContent(viewModel: viewModel)
    }
}

struct ProfileContent: View {
    @ObservedObject var viewModel: LegacyProfileViewModel

    var body: some View {
        Text(viewModel.name)
    }
}
```

**Possible follow-up questions:**  
What problem did `@StateObject` solve? How does this change with `@Observable`?

### [Intermediate] What are `ObservableObject` and `@Published`?
**Interview answer:**  
`ObservableObject` is a Combine-based protocol for reference types whose changes SwiftUI can observe. `@Published` marks properties that emit `objectWillChange` before changing.

**Deep explanation:**  
Before iOS 17 Observation, this was the main way to model view state in reference-type view models. The object emits a broad change notification, and observing views update.

**Why it matters:**  
Many production apps still support older OS versions and use `ObservableObject`. Interviewers expect you to know both old and new systems.

**How it works:**  
`@Published` publishes changes through Combine. SwiftUI subscribes to `objectWillChange` and invalidates views observing the object.

**Use cases:**  
Apps supporting iOS 13-16, Combine pipelines, shared view models, and legacy codebases.

**Common mistakes:**  
Publishing from background threads. Marking every property as `@Published` even if UI does not observe it. Creating one huge object that invalidates many views.

**Best practices:**  
Mark UI-facing models `@MainActor`. Keep objects focused. Use `private(set)` for read-only UI state.

**Red flag answers:**  
"@Published changes after didSet only." Combine's `@Published` emits in `willSet`, which can surprise people outside SwiftUI.

**Code example:**  
```swift
@MainActor
final class InboxViewModel: ObservableObject {
    @Published private(set) var messages: [Message] = []

    func load() async {
        messages = (try? await InboxService().messages()) ?? []
    }
}
```

**Possible follow-up questions:**  
What thread should `@Published` updates happen on? Why can `objectWillChange` be too broad?

### [Senior] Observation framework vs `ObservableObject`: what changed?
**Interview answer:**  
Observation is macro-based, does not require Combine, does not require every observed property to be marked `@Published`, and can track property reads more precisely. `ObservableObject` is Combine-based and emits broader object-level changes.

**Deep explanation:**  
Observation was introduced to make observable reference models easier, more general, and better integrated with modern Swift. It avoids repeating `@Published` and supports computed property tracking patterns better.

**Why it matters:**  
Modern SwiftUI interviews increasingly ask about the iOS 17 data flow model. Strong candidates know how to migrate without blindly mixing both systems.

**How it works:**  
`@Observable` macro instruments property access and mutation. SwiftUI tracks which properties a view reads. `ObservableObject` uses Combine's `objectWillChange` publisher.

**Use cases:**  
Use Observation for iOS 17+ SwiftUI models. Use `ObservableObject` when supporting older OS versions or Combine-heavy code.

**Common mistakes:**  
Combining `@Observable` and `@Published` unnecessarily. Using old property wrappers with new observable models without understanding ownership.

**Best practices:**  
Choose one model per feature based on deployment target. Keep migration incremental and test UI invalidation behavior.

**Red flag answers:**  
"Observation is just syntax sugar." It changes dependency tracking and removes Combine as a requirement.

**Code example:**  
```swift
@Observable
final class CounterModel {
    var count = 0
    var isEven: Bool { count.isMultiple(of: 2) }
}

struct CounterScreen: View {
    @State private var model = CounterModel()

    var body: some View {
        VStack {
            Text(model.isEven ? "Even" : "Odd")
            Button("Increment") {
                model.count += 1
            }
        }
    }
}
```

**Possible follow-up questions:**  
How do you support iOS 16 and iOS 17? How does property-level tracking affect performance?

### [Intermediate] What are `@Environment`, `@AppStorage`, `@SceneStorage`, and `@FocusState`?
**Interview answer:**  
They are SwiftUI property wrappers for framework-managed state/context. `@Environment` reads contextual values, `@AppStorage` bridges to UserDefaults, `@SceneStorage` persists scene-specific UI state, and `@FocusState` manages focus.

**Deep explanation:**  
Each wrapper has a specific ownership and persistence model. Confusing them leads to hidden dependencies or incorrect persistence.

**Why it matters:**  
These wrappers are common in real apps: themes, settings, scene restoration, keyboard focus, and form UX.

**How it works:**  
SwiftUI connects property wrappers to environment, storage, or focus systems and invalidates views when values change.

**Use cases:**  
`@Environment(\.dismiss)`, dark mode, persisted toggles, selected tab restoration, focused text field.

**Common mistakes:**  
Storing sensitive data in `@AppStorage`. Using `@SceneStorage` for business data. Treating focus as model state.

**Best practices:**  
Use `@AppStorage` for lightweight non-sensitive preferences only. Use Keychain for secrets. Use `@FocusState` for UI focus, not validation state.

**Red flag answers:**  
"AppStorage is a database." It is a convenience wrapper over UserDefaults.

**Code example:**  
```swift
struct LoginForm: View {
    enum Field {
        case email
        case password
    }

    @AppStorage("hasSeenTips") private var hasSeenTips = false
    @FocusState private var focusedField: Field?

    var body: some View {
        Form {
            TextField("Email", text: .constant(""))
                .focused($focusedField, equals: .email)
            SecureField("Password", text: .constant(""))
                .focused($focusedField, equals: .password)
        }
    }
}
```

**Possible follow-up questions:**  
What should not go in UserDefaults? How do you manage focus in a dynamic form?

### [Senior] What are source-of-truth mistakes in SwiftUI?
**Interview answer:**  
A source-of-truth mistake happens when the same state is duplicated in multiple places or owned by the wrong view/model, causing stale UI, conflicting updates, or reset behavior.

**Deep explanation:**  
SwiftUI works best with a single authoritative owner for each piece of mutable state. Other views should derive from it, bind to it, or send actions to mutate it.

**Why it matters:**  
Most SwiftUI bugs in forms, navigation, and lists come from duplicated state.

**How it works:**  
If parent and child both keep independent copies, SwiftUI cannot know which one is authoritative. Updates may flow one way but not back.

**Use cases:**  
Editable forms, sheet presentation, selected row, navigation path, filters, and toggles.

**Common mistakes:**  
Initializing child `@State` from parent props. Keeping both `selectedID` and `selectedItem` mutable without synchronization. Making every child own its own view model.

**Best practices:**  
Lift shared state to the nearest common owner. Use derived values where possible. Use bindings for simple edits and actions for domain changes.

**Red flag answers:**  
"Just add another @State." That often hides the ownership problem.

**Code example:**  
```swift
struct ParentView: View {
    @State private var name = ""

    var body: some View {
        ChildEditor(name: $name)
    }
}

struct ChildEditor: View {
    @Binding var name: String

    var body: some View {
        TextField("Name", text: $name)
    }
}
```

**Possible follow-up questions:**  
When should child state stay local? How do you model derived state?
## 4. State Management Map

*Choosing the right wrapper by ownership, lifetime, and write direction.*

> **Minimum OS note:** `@State`, `@Binding`, `@ObservedObject`, `@Environment`, and `@EnvironmentObject` date to iOS 13. `@StateObject` is iOS 14. `@Observable`, Observation, and `@Bindable` are iOS 17.

Most SwiftUI bugs are state ownership bugs. The wrapper is not decoration; it declares who owns the value, how long it should live, who can write to it, and how changes invalidate views.

The modern iOS 17 recommendation is often: use `@Observable` reference models where reference identity is useful, store owned observable models with `@State`, pass them normally, and use `@Bindable` when a child needs bindings into observable properties. For iOS 14-16 compatibility, use `ObservableObject`, `@Published`, `@StateObject`, and `@ObservedObject`.

### State ownership decision path

```mermaid
flowchart LR
    n1["Is it local value state?"]
    n2["@State"]
    n3["Does child edit parent?"]
    n4["@Binding"]
    n5["Shared dependency?"]
    n6["@Environment"]
    n7["Reference model owner?"]
    n8["@State / @StateObject"]
    n9["Reference model observer?"]
    n10["plain param / @ObservedObject"]
    n1 --> n2
    n2 --> n3
    n3 --> n4
    n4 --> n5
    n5 --> n6
    n6 --> n7
    n7 --> n8
    n8 --> n9
    n9 --> n10
```

### What it is

SwiftUI property wrappers are adapters between transient view values and durable graph/model state. `DynamicProperty` wrappers are updated by SwiftUI before body evaluation.

`@State` stores view-owned value state. `@Binding` projects read/write access to someone else's state. `@Observable` marks a model whose property reads can be tracked. `@Environment` reads values supplied by ancestors or the system.

### Why it exists

SwiftUI view structs are recreated. Without wrapper-managed storage, local mutable UI state would disappear on every recomputation.

Wrappers make data flow explicit. You can see whether a view owns state, observes a model, receives a binding, or consumes a dependency.

### How it works internally/conceptually

`@State` stores a value in SwiftUI graph storage associated with view identity. The property inside the struct is a handle to that storage.

`@Binding` stores get/set closures or a location-like reference to another source. It does not own data.

`@Observable` expands through macros into registrar-backed access and mutation hooks. SwiftUI can track which observable properties were read and invalidate views when those properties mutate.

`ObservableObject` uses Combine's `objectWillChange`; it is coarser because object-level change often invalidates observers regardless of which property was read.

### Wrapper decision matrix

| Wrapper            | Owns data?        | Typical lifetime   | Use when                                                | Minimum                                  |
| ------------------ | ----------------- | ------------------ | ------------------------------------------------------- | ---------------------------------------- |
| @State             | Yes               | View identity      | Local value state or owned iOS 17 observable model      | iOS 13; observable object storage iOS 17 |
| @Binding           | No                | Parent source      | Child edits parent-owned state                          | iOS 13                                   |
| @Observable        | Model owns itself | Reference lifetime | Fine-grained observable reference model                 | iOS 17                                   |
| @Bindable          | No                | Observable source  | Need `$model.property` binding into @Observable         | iOS 17                                   |
| @StateObject       | Yes               | View identity      | Own ObservableObject on iOS 14-16 or Combine model      | iOS 14                                   |
| @ObservedObject    | No                | External owner     | Observe ObservableObject passed from parent             | iOS 13                                   |
| @Environment       | No                | Ancestor/system    | Read dependency/config such as locale, dismiss, service | iOS 13                                   |
| @EnvironmentObject | No                | Ancestor object    | Legacy broad shared ObservableObject dependency         | iOS 13                                   |

### When to use it

- Use `@State` for view-private scalar values: selection, draft text, toggles, expansion state, currently focused filter.
- Use `@Binding` when a reusable child edits a value the parent owns.
- Use `@Observable` for view models or stores on iOS 17+ when multiple properties drive SwiftUI.
- Use `@StateObject` for compatibility with `ObservableObject` models that the view creates and owns.
- Use `@Environment` for cross-cutting dependencies, system values, and actions that should be available without plumbing through every initializer.

### Common mistakes

- Creating an `ObservableObject` with `@ObservedObject var vm = VM()` inside a view. It can be recreated. Use `@StateObject` for Combine-era owned models.
- Passing bindings deep through unrelated layers instead of creating an action or view model method.
- Using `@EnvironmentObject` as a service locator. It hides dependencies and crashes at runtime when missing.
- Putting source-of-truth state in two places, then trying to synchronize them manually.

### Practical code example - modern Observation

```swift
import SwiftUI
import Observation

@Observable
final class ProfileViewModel {
    var displayName = ""
    var isSaving = false

    func save() async throws {
        isSaving = true
        defer { isSaving = false }
        try await Task.sleep(for: .milliseconds(300))
    }
}

struct ProfileView: View {
    @State private var viewModel = ProfileViewModel()

    var body: some View {
        ProfileForm(viewModel: viewModel)
    }
}

struct ProfileForm: View {
    @Bindable var viewModel: ProfileViewModel

    var body: some View {
        Form {
            TextField("Display name", text: $viewModel.displayName)
            Button("Save") {
                Task { try? await viewModel.save() }
            }
            .disabled(viewModel.isSaving)
        }
    }
}
```

### Practical code example - iOS 14-16 fallback

```swift
final class ProfileViewModel: ObservableObject {
    @Published var displayName = ""
    @Published var isSaving = false
}

struct ProfileView: View {
    @StateObject private var viewModel = ProfileViewModel()

    var body: some View {
        ProfileForm(viewModel: viewModel)
    }
}

struct ProfileForm: View {
    @ObservedObject var viewModel: ProfileViewModel

    var body: some View {
        TextField("Display name", text: $viewModel.displayName)
    }
}
```

### Best practices

- Start every state decision with ownership: who creates this value, who mutates it, and what identity should preserve it?
- Prefer initializer injection for required dependencies. Use environment for system-like dependencies or values that are intentionally ambient.
- Keep mutable state minimal and derive everything else. Duplicated derived state is a common source of stale UI.
- Use `@MainActor` on UI-facing view models that mutate properties read by SwiftUI.

### Exercises or checkpoints

- For one existing screen, mark every property as source state, derived state, dependency, or UI-only draft.
- Rewrite a child view from `@State` to `@Binding` and explain which view owns the value after the change.
- Create an iOS 17 Observation model and a Combine fallback version. Explain the invalidation differences.

### Chapter Summary

- State wrappers encode ownership and invalidation. Pick them by lifetime and write direction.
- Modern Observation is fine-grained and iOS 17+. Combine-era wrappers remain important for older targets.
- Most state bugs are duplicate source-of-truth or unstable owner bugs.

### Practice Task

- Build a settings screen with three editable fields. Use parent-owned state, a child form with bindings, an environment-provided save service, and a clear loading/error state.


## 5. Environment, Dependencies, and App Architecture

*Ambient values without turning your app into a service locator.*

> **Minimum OS note:** `@Environment` and custom `EnvironmentKey` are iOS 13 foundations. Some typed environment conveniences are newer, but the pattern is stable.

Environment is SwiftUI's scoped dependency/value propagation system. It carries values down the view tree without manually passing every value through every initializer.

Environment is powerful because it is contextual. It is dangerous when used to hide required dependencies. Use it deliberately for values that truly behave like context: locale, color scheme, dismiss action, scene phase, feature flags, and app services that many leaves need.

### Environment lookup

```mermaid
flowchart LR
    n1["Root sets value"]
    n2["Parent can override"]
    n3["Child reads key"]
    n4["Read becomes dependency"]
    n5["Change invalidates readers"]
    n1 --> n2
    n2 --> n3
    n3 --> n4
    n4 --> n5
```

### What it is

`@Environment` reads a value from `EnvironmentValues`. SwiftUI provides many built-in keys, and you can define your own keys for app-level dependencies.

`@EnvironmentObject` is a legacy convenience for reading an `ObservableObject` supplied by an ancestor. It is runtime-checked and crashes if missing.

### Why it exists

Without environment, every low-level view would need to accept dozens of values: color scheme, dynamic type size, locale, dismiss action, model context, accessibility settings, and dependencies. Environment keeps view APIs focused.

It also lets ancestors override context for subtrees. For example, a preview can inject a mock repository, or a sheet can override edit mode.

### How it works internally/conceptually

Environment values flow through the SwiftUI graph. When a view reads an environment value during body evaluation, that read becomes a dependency. If the value changes, SwiftUI can invalidate readers.

The environment is value-like and scoped. An override applies to the modified view's subtree, not globally.

### When to use it

- Use initializer injection for dependencies a view cannot function without and that are specific to a feature.
- Use environment for cross-cutting context, app services shared by many features, and dependencies you need to swap in previews/tests.
- Avoid `@EnvironmentObject` unless your architecture already uses it and you have strong runtime coverage.

### Common mistakes

- Hiding every dependency in environment. This makes views look reusable while secretly requiring app setup.
- Forgetting preview injection. A custom environment key should have a harmless default or previews should explicitly inject mocks.
- Mutating environment values directly. Environment is read through the view; changes come from modifiers or ancestor state.

### Practical code example

```swift
protocol UserRepository: Sendable {
    func currentUser() async throws -> User
}

private struct UserRepositoryKey: EnvironmentKey {
    static let defaultValue: UserRepository = PreviewUserRepository()
}

extension EnvironmentValues {
    var userRepository: UserRepository {
        get { self[UserRepositoryKey.self] }
        set { self[UserRepositoryKey.self] = newValue }
    }
}

struct ProfileScreen: View {
    @Environment(\.userRepository) private var userRepository
    @State private var user: User?

    var body: some View {
        Content(user: user)
            .task {
                user = try? await userRepository.currentUser()
            }
    }
}
```

### Best practices

- Prefer protocol-typed dependencies for testability.
- Keep environment defaults safe for previews, but do not let production accidentally use preview services.
- Document custom environment keys in the feature boundary, especially when they replace constructor parameters.
- Read environment in views; pass concrete dependencies into pure models or use cases explicitly.

### Exercises or checkpoints

- Create a custom environment key for an analytics client and inject a no-op preview client.
- Identify one dependency that should remain an initializer parameter because the view cannot function without it.
- Explain why environment overrides are subtree-scoped rather than global.

### Chapter Summary

- Environment is scoped contextual dependency propagation.
- Use it for ambient values and widely shared services, not as a blanket service locator.
- Initializer injection remains the clearest option for required feature dependencies.

### Practice Task

- Build a feature preview that injects mock repository and analytics services through environment, while the production app injects real services at the feature root.

## Additional Code Examples: State Management

### iOS 17 Observation Setup
```swift
import SwiftUI
import Observation

@Observable
class UserSettings {
    var isNotificationsEnabled: Bool = false
    var preferredTheme: String = "System"
}

struct SettingsView: View {
    // Just state, no StateObject needed in iOS 17+
    @State private var settings = UserSettings()
    
    var body: some View {
        Form {
            Toggle("Notifications", isOn: $settings.isNotificationsEnabled)
            Picker("Theme", selection: $settings.preferredTheme) {
                Text("System").tag("System")
                Text("Light").tag("Light")
                Text("Dark").tag("Dark")
            }
        }
    }
}
```

### Passing Bindings to Child Views
```swift
struct ParentView: View {
    @State private var text: String = ""
    
    var body: some View {
        VStack {
            Text("Typing: \(text)")
            ChildInputView(inputText: $text)
        }
    }
}

struct ChildInputView: View {
    @Binding var inputText: String
    
    var body: some View {
        TextField("Enter something...", text: $inputText)
            .textFieldStyle(.roundedBorder)
    }
}
```
