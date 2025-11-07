# Error Handling Flow Diagram

This diagram illustrates how errors are caught, processed, classified, logged, and handled throughout the Eye-Doo application.

```mermaid
graph TB
    %% Error Sources
    subgraph Sources["Error Sources"]
        UA[User Actions]
        C[Components]
        S[Services]
        R[Repositories]
        API[External APIs]
        P[Promise Rejections]
    end

    %% Error Catching Layer
    subgraph Catching["Error Catching Layer"]
        EB[ErrorBoundary<br/>error-boundary.tsx]
        GEH[GlobalErrorHandler<br/>global-error-handler.ts]
        WH[Wrap Helpers<br/>result-helpers.ts]
    end

    %% Error Classification & Mapping
    subgraph Classification["Error Classification & Mapping"]
        EC[ErrorClassifier<br/>error-classifier.ts]
        EM[ErrorMapper<br/>error-mapper.ts]
        ECR[ErrorCode Registry<br/>error-code-registry.ts]
        ERR[Error Classes<br/>errors.ts]
    end

    %% Context Management
    subgraph Context["Context Management"]
        ECB[ErrorContextBuilder<br/>error-context-builder.ts]
        ECC[ErrorContextCapture<br/>error-context-capture.ts]
        LC[LogContext<br/>logging-service.ts]
    end

    %% Error Processing
    subgraph Processing["Error Processing"]
        AEH[AppErrorHandler<br/>error-handler-service.ts]
        LS[LoggingService<br/>logging-service.ts]
        UEH[useErrorHandler Hook<br/>use-error-handler.ts]
    end

    %% Error Recovery
    subgraph Recovery["Error Recovery"]
        RETRY[withRetry<br/>error-recovery.ts]
        FALLBACK[withFallback<br/>error-recovery.ts]
        TIMEOUT[withTimeout<br/>error-recovery.ts]
        CB[CircuitBreaker<br/>error-recovery.ts]
        BH[Bulkhead<br/>error-recovery.ts]
    end

    %% Error Display
    subgraph Display["Error Display"]
        TOAST[Toast Notifications<br/>use-ui-store.ts]
        UI[User Interface]
    end

    %% Flow from Sources
    UA -->|1. User Action| C
    C -->|2. Component Error| EB
    C -->|3. Service Call| S
    S -->|4. Repository Call| R
    R -->|5. API Error| API
    API -->|6. Network Error| WH
    P -->|7. Unhandled Rejection| GEH

    %% Error Catching
    C -->|Caught by| EB
    S -->|Wrapped by| WH
    API -->|Wrapped by| WH
    P -->|Caught by| GEH

    %% Error Boundary Processing
    EB -->|classify| EC
    EB -->|map to AppError| EM
    EB -->|capture context| ECC
    EB -->|handle| AEH

    %% Global Error Handler Processing
    GEH -->|map to AppError| EM
    GEH -->|capture context| ECC
    GEH -->|handle| AEH

    %% Wrap Helpers Processing
    WH -->|catch error| EM
    WH -->|create Result| ERR

    %% Error Classification
    EC -->|uses| ECR
    EC -->|categorizes| ERR
    EC -->|returns| ErrorCategory["ErrorCategory<br/>{severity, canRecover, etc.}"]

    %% Error Mapping
    EM -->|uses| ECR
    EM -->|creates| ERR
    EM -->|mapToAppError| AppError["AppError<br/>{code, message, userMessage, retryable}"]

    %% Error Classes
    ECR -->|defines| ErrorCode["ErrorCode Enum"]
    ERR -->|implements| AppError["AppError Interface"]
    ERR -->|includes| AuthError["AuthError<br/>FirestoreError<br/>NetworkError<br/>etc."]

    %% Context Building
    ECB -->|builds| LC
    ECC -->|captures| LC
    LC -->|used by| LS
    LC -->|used by| AEH

    %% Error Handler Processing
    AEH -->|log error| LS
    AEH -->|show toast| TOAST
    AEH -->|build context| ECB
    AEH -->|classify| EC

    %% Logging Service
    LS -->|uses| LC
    LS -->|logs to| Console["Console/Sentry"]
    LS -->|structured logs| LogData["Log Data<br/>{component, method, userId, metadata}"]

    %% Hook Integration
    UEH -->|calls| AEH
    C -->|uses| UEH

    %% Error Recovery
    RETRY -->|wraps operation| WH
    FALLBACK -->|wraps operation| WH
    TIMEOUT -->|wraps operation| WH
    CB -->|wraps operation| WH
    BH -->|wraps operation| WH

    RETRY -->|creates error| EM
    TIMEOUT -->|creates error| EM
    CB -->|creates error| EM

    %% Display
    TOAST -->|displays| UI
    TOAST -->|deduplicates| ToastHistory["Toast History<br/>{Map<key, timestamp>}"]

    %% Service Error Flow
    S -->|returns Result| Result["Result<T, AppError>"]
    Result -->|success| Success["Success Path"]
    Result -->|error| ERR
    ERR -->|handled by| AEH

    %% Styling
    classDef sourceClass fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef catchClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef processClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef recoveryClass fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef displayClass fill:#fce4ec,stroke:#880e4f,stroke-width:2px

    class UA,C,S,R,API,P sourceClass
    class EB,GEH,WH catchClass
    class EC,EM,ECR,ERR,ECB,ECC,LC,AEH,LS,UEH processClass
    class RETRY,FALLBACK,TIMEOUT,CB,BH recoveryClass
    class TOAST,UI displayClass
```

## Error Flow Sequences

### Sequence 1: Component Error Flow

```mermaid
sequenceDiagram
    participant C as Component
    participant EB as ErrorBoundary
    participant EC as ErrorClassifier
    participant EM as ErrorMapper
    participant AEH as AppErrorHandler
    participant LS as LoggingService
    participant TOAST as Toast

    C->>EB: Throws Error
    EB->>EC: classify(error)
    EC->>EC: Determines severity
    EC-->>EB: ErrorCategory

    EB->>EM: mapToAppError(error)
    EM->>EM: Creates AppError
    EM-->>EB: AppError

    EB->>ECC: capture(error, errorInfo)
    ECC-->>EB: ErrorContext

    EB->>AEH: handle(AppError, context)
    AEH->>ECB: Build context
    ECB-->>AEH: LogContext

    AEH->>LS: error(AppError, LogContext)
    LS-->>AEH: Logged

    AEH->>TOAST: showToast(error.userMessage)
    TOAST-->>UI: Display Toast
```

### Sequence 2: Service Error Flow

```mermaid
sequenceDiagram
    participant C as Component/Hook
    participant S as Service
    participant WH as WrapHelper
    participant EM as ErrorMapper
    participant ERR as Error Classes
    participant AEH as AppErrorHandler
    participant UEH as useErrorHandler

    C->>S: Call service method
    S->>WH: wrapAsyncOperation(operation)
    WH->>WH: try { operation() }
    WH->>WH: catch (error)

    WH->>EM: fromFirestore(error, context)
    EM->>ERR: new FirestoreError(...)
    ERR-->>EM: AppError
    EM-->>WH: AppError

    WH-->>S: Result<T, AppError>
    S-->>C: Result<T, AppError>

    C->>C: if (!result.success)
    C->>UEH: handleError(result.error)
    UEH->>AEH: handle(error, context)
    AEH->>LS: Log error
    AEH->>TOAST: Show toast
```

### Sequence 3: Global Error Flow

```mermaid
sequenceDiagram
    participant P as Promise/Global Error
    participant GEH as GlobalErrorHandler
    participant EM as ErrorMapper
    participant AEH as AppErrorHandler
    participant LS as LoggingService
    participant TOAST as Toast

    P->>GEH: Unhandled rejection/error
    GEH->>GEH: handleUnhandledRejection(reason)
    GEH->>EM: mapToAppError(error)

    EM->>EM: Check error type
    EM->>EM: Create appropriate AppError
    EM-->>GEH: AppError

    GEH->>AEH: handle(AppError)
    AEH->>LS: error(AppError, context)
    LS-->>AEH: Logged

    AEH->>TOAST: showToast(error.userMessage)
    TOAST-->>UI: Display Toast
```

### Sequence 4: Error Recovery Flow

```mermaid
sequenceDiagram
    participant S as Service
    participant RT as withRetry
    participant OP as Operation
    participant EM as ErrorMapper
    participant LS as LoggingService

    S->>RT: withRetry(operation, options)
    RT->>OP: Execute operation
    OP-->>RT: Result<T, AppError>

    alt Success
        RT-->>S: ok(value)
    else Error (retryable)
        RT->>RT: Check retryable flag
        RT->>RT: Wait delayMs
        RT->>OP: Retry operation
    else Error (non-retryable)
        RT->>LS: Log failure
        RT-->>S: err(AppError)
    else Max attempts reached
        RT->>LS: Log final failure
        RT-->>S: err(AppError)
    end
```

## Component Relationships

```mermaid
graph LR
    subgraph Core["Core Error System"]
        ECR[ErrorCode Registry]
        ERR[Error Classes]
        APP[AppError Interface]
    end

    subgraph Catching["Error Catching"]
        EB[ErrorBoundary]
        GEH[GlobalErrorHandler]
        WH[Wrap Helpers]
    end

    subgraph Processing["Error Processing"]
        EM[ErrorMapper]
        EC[ErrorClassifier]
        AEH[AppErrorHandler]
    end

    subgraph Context["Context"]
        ECB[ContextBuilder]
        ECC[ContextCapture]
        LC[LogContext]
    end

    subgraph Logging["Logging"]
        LS[LoggingService]
    end

    subgraph Recovery["Recovery"]
        RETRY[Retry]
        TIMEOUT[Timeout]
        CB[CircuitBreaker]
    end

    ECR --> ERR
    ERR --> APP
    APP --> EM
    APP --> EC
    APP --> AEH

    EB --> EC
    EB --> EM
    GEH --> EM
    WH --> EM

    EM --> ERR
    EC --> ECR
    AEH --> LS
    AEH --> EC

    ECB --> LC
    ECC --> LC
    LC --> LS
    LC --> AEH

    RETRY --> EM
    TIMEOUT --> EM
    CB --> EM

    AEH --> TOAST[Toast System]
```

## Error State Machine

```mermaid
stateDiagram-v2
    [*] --> Caught: Error Occurs

    Caught --> Classified: ErrorClassifier.classify()
    Classified --> Critical: severity = critical
    Classified --> NonCritical: severity = non-critical
    Classified --> Recoverable: severity = recoverable

    Critical --> Mapped: mapToAppError()
    NonCritical --> Mapped: mapToAppError()
    Recoverable --> Mapped: mapToAppError()

    Mapped --> Logged: LoggingService.error()
    Logged --> Handled: AppErrorHandler.handle()

    Handled --> ToastShown: Show Toast
    Handled --> RecoveryAttempted: error.retryable = true

    RecoveryAttempted --> RetrySuccess: Operation succeeds
    RecoveryAttempted --> RetryFailed: Max attempts reached

    RetrySuccess --> [*]
    RetryFailed --> ToastShown
    ToastShown --> UserAction: User clicks Retry/Close

    UserAction --> [*]

    note right of Critical
        Full screen fallback
        User action required
    end note

    note right of NonCritical
        Inline error display
        Graceful degradation
    end note

    note right of Recoverable
        Can retry automatically
        Toast with retry button
    end note
```

## Key Relationships Summary

### 1. **Error Sources → Catching**

- Components → ErrorBoundary
- Promises → GlobalErrorHandler
- Services/Repositories → Wrap Helpers

### 2. **Catching → Classification**

- All errors → ErrorClassifier
- ErrorClassifier uses ErrorCode Registry
- Returns ErrorCategory with severity

### 3. **Catching → Mapping**

- All errors → ErrorMapper
- ErrorMapper uses ErrorCode Registry
- Creates appropriate Error Class (AuthError, FirestoreError, etc.)

### 4. **Mapping → Processing**

- AppError → AppErrorHandler
- AppErrorHandler → LoggingService
- AppErrorHandler → Toast System

### 5. **Context Management**

- ErrorContextBuilder → Creates LogContext
- ErrorContextCapture → Captures runtime context
- LogContext → Used by LoggingService and AppErrorHandler

### 6. **Recovery Strategies**

- withRetry → Wraps operations, uses ErrorMapper for timeout errors
- withTimeout → Creates timeout errors via ErrorMapper
- CircuitBreaker → Creates circuit breaker errors via ErrorMapper
- All recovery → Returns Result<T, AppError>

### 7. **Display Layer**

- AppErrorHandler → Toast System (with deduplication)
- Toast System → User Interface
- ErrorBoundary → Inline or Full Screen UI

## Data Flow

```mermaid
flowchart TD
    Error["Error<br/>{message, stack}"] --> Classify["ErrorClassifier<br/>classify()"]
    Classify --> Category["ErrorCategory<br/>{severity, canRecover, shouldShowFullScreen}"]

    Error --> Map["ErrorMapper<br/>fromFirestore/fromZod/etc()"]
    Map --> AppError["AppError<br/>{code, message, userMessage, retryable, context}"]

    AppError --> Handler["AppErrorHandler<br/>handle()"]
    Category --> Handler

    Handler --> LogContext["LogContext<br/>{component, method, userId, metadata}"]
    LogContext --> Logging["LoggingService<br/>error()"]

    Handler --> ToastConfig["ToastConfig<br/>{message, type, action}"]
    ToastConfig --> Toast["Toast System<br/>showToast()"]

    AppError --> Recovery["Recovery Strategies<br/>{retry, timeout, fallback}"]
    Recovery --> Result["Result<T, AppError>"]
```

## File Dependencies

```mermaid
graph TD
    ECR["error-code-registry.ts<br/>ErrorCode enum"] --> ERR["errors.ts<br/>Error classes"]
    ERR --> EM["error-mapper.ts<br/>ErrorMapper"]
    ERR --> EC["error-classifier.ts<br/>ErrorClassifier"]

    LS["logging-service.ts<br/>LogContext interface"] --> DOMAIN["errors.ts<br/>Re-export LogContext"]
    DOMAIN --> ECB["error-context-builder.ts"]
    DOMAIN --> AEH["error-handler-service.ts"]
    DOMAIN --> UEH["use-error-handler.ts"]

    EM --> WH["result-helpers.ts<br/>Wrap helpers"]
    EM --> ER["error-recovery.ts<br/>Recovery strategies"]

    EC --> EB["error-boundary.tsx<br/>ErrorBoundary"]
    EM --> EB
    EM --> GEH["global-error-handler.ts"]

    ECC["error-context-capture.ts"] --> EB

    AEH --> LS
    AEH --> TOAST["use-ui-store.ts<br/>Toast system"]

    UEH --> AEH
    EB --> AEH
    GEH --> AEH
```

This diagram shows how all error handling components work together to provide comprehensive error management across your application.
