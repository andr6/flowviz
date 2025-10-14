# Python Code Review Guide - Senior Reviewer Edition

**Role**: Senior Code Reviewer
**Language**: Python
**Last Updated**: October 10, 2025

---

## Table of Contents
1. [Code Quality & Best Practices](#1-code-quality--best-practices)
2. [Performance Implications](#2-performance-implications)
3. [Security Vulnerabilities](#3-security-vulnerabilities)
4. [Test Coverage & Quality](#4-test-coverage--quality)
5. [Documentation Completeness](#5-documentation-completeness)
6. [Architectural Concerns](#6-architectural-concerns)
7. [Constructive Feedback Formatting](#7-constructive-feedback-formatting)

---

## 1. Code Quality & Best Practices

### Python Style Guide (PEP 8)

#### Naming Conventions
- [ ] **Variables/functions**: `snake_case` (lowercase with underscores)
  ```python
  # Good
  user_count = 10
  def calculate_total_price(): pass

  # Bad
  userCount = 10
  def CalculateTotalPrice(): pass
  ```

- [ ] **Classes**: `PascalCase` (capitalized words)
  ```python
  # Good
  class UserProfile: pass
  class DataProcessor: pass

  # Bad
  class user_profile: pass
  class data_processor: pass
  ```

- [ ] **Constants**: `UPPER_SNAKE_CASE`
  ```python
  # Good
  MAX_CONNECTIONS = 100
  DEFAULT_TIMEOUT = 30

  # Bad
  maxConnections = 100
  default_timeout = 30
  ```

- [ ] **Private attributes**: Single leading underscore `_private`
  ```python
  # Good
  class BankAccount:
      def __init__(self):
          self._balance = 0  # Private attribute

  # Avoid (unless name mangling needed)
  class BankAccount:
      def __init__(self):
          self.__balance = 0  # Name mangling (rarely needed)
  ```

- [ ] **Avoid single-letter names** except for counters/indices
  ```python
  # Good
  for index, item in enumerate(items):
      process(item)

  # Acceptable
  for i, x in enumerate(coordinates):
      plot(x)

  # Bad
  def f(x, y, z):  # Unclear purpose
      return x + y * z
  ```

#### Code Structure

- [ ] **Line length**: Maximum 79 characters (PEP 8) or 100 (modern projects)
  ```python
  # Good
  result = some_function(
      arg1, arg2, arg3,
      arg4, arg5
  )

  # Bad
  result = some_function(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8)
  ```

- [ ] **Imports**: Organized by standard lib → third-party → local
  ```python
  # Good
  import os
  import sys
  from pathlib import Path

  import numpy as np
  import pandas as pd

  from .models import User
  from .utils import logger

  # Bad - Mixed order
  from .models import User
  import numpy as np
  import os
  ```

- [ ] **Absolute imports** preferred over relative
  ```python
  # Good
  from myproject.utils.helpers import format_date

  # Acceptable
  from ..utils.helpers import format_date

  # Avoid
  from ...package.module import something
  ```

- [ ] **No wildcard imports**: `from module import *`
  ```python
  # Good
  from datetime import datetime, timedelta

  # Bad
  from datetime import *
  ```

#### Pythonic Code

- [ ] **List comprehensions** for simple transformations
  ```python
  # Good
  squares = [x**2 for x in range(10)]
  evens = [x for x in numbers if x % 2 == 0]

  # Bad
  squares = []
  for x in range(10):
      squares.append(x**2)
  ```

- [ ] **Generator expressions** for large datasets
  ```python
  # Good - Memory efficient
  total = sum(x**2 for x in range(1000000))

  # Bad - Loads entire list in memory
  total = sum([x**2 for x in range(1000000)])
  ```

- [ ] **Context managers** for resource management
  ```python
  # Good
  with open('file.txt', 'r') as f:
      data = f.read()

  # Bad
  f = open('file.txt', 'r')
  data = f.read()
  f.close()  # Easy to forget or skip on error
  ```

- [ ] **Enumerate** instead of range(len())
  ```python
  # Good
  for index, item in enumerate(items):
      print(f"{index}: {item}")

  # Bad
  for i in range(len(items)):
      print(f"{i}: {items[i]}")
  ```

- [ ] **Dict.get()** with defaults instead of if/else
  ```python
  # Good
  value = config.get('timeout', 30)

  # Bad
  if 'timeout' in config:
      value = config['timeout']
  else:
      value = 30
  ```

- [ ] **f-strings** for formatting (Python 3.6+)
  ```python
  # Good
  message = f"Hello, {name}! You have {count} messages."

  # Bad
  message = "Hello, {}! You have {} messages.".format(name, count)
  message = "Hello, " + name + "! You have " + str(count) + " messages."
  ```

#### Type Hints

- [ ] **Type annotations** for function signatures
  ```python
  # Good
  def calculate_discount(price: float, percentage: int) -> float:
      return price * (1 - percentage / 100)

  # Better - More specific types
  from typing import List, Dict, Optional

  def process_users(
      users: List[Dict[str, str]],
      active_only: bool = True
  ) -> Optional[List[str]]:
      pass
  ```

- [ ] **Use typing module** for complex types
  ```python
  from typing import List, Dict, Tuple, Optional, Union, Callable

  # Good
  def process_data(
      data: List[Dict[str, Union[int, str]]],
      callback: Optional[Callable[[str], None]] = None
  ) -> Tuple[int, int]:
      pass
  ```

- [ ] **TypedDict** for structured dictionaries
  ```python
  from typing import TypedDict

  class UserDict(TypedDict):
      name: str
      age: int
      email: str

  def create_user(user_data: UserDict) -> User:
      pass
  ```

#### Error Handling

- [ ] **Specific exceptions** instead of bare except
  ```python
  # Good
  try:
      result = risky_operation()
  except ValueError as e:
      logger.error(f"Invalid value: {e}")
  except ConnectionError as e:
      logger.error(f"Connection failed: {e}")

  # Bad
  try:
      result = risky_operation()
  except:  # Catches everything including KeyboardInterrupt!
      pass
  ```

- [ ] **Custom exceptions** for domain-specific errors
  ```python
  # Good
  class InvalidConfigurationError(Exception):
      """Raised when configuration is invalid"""
      pass

  class DatabaseConnectionError(Exception):
      """Raised when database connection fails"""
      pass

  def load_config(path: str) -> dict:
      if not os.path.exists(path):
          raise InvalidConfigurationError(f"Config file not found: {path}")
  ```

- [ ] **Exception chaining** to preserve context
  ```python
  # Good
  try:
      data = load_data()
  except FileNotFoundError as e:
      raise DataLoadError("Failed to load data") from e

  # Bad - Loses original exception context
  try:
      data = load_data()
  except FileNotFoundError:
      raise DataLoadError("Failed to load data")
  ```

- [ ] **EAFP** (Easier to Ask Forgiveness than Permission)
  ```python
  # Good - Pythonic
  try:
      value = my_dict['key']
  except KeyError:
      value = default_value

  # Bad - Less Pythonic
  if 'key' in my_dict:
      value = my_dict['key']
  else:
      value = default_value
  ```

#### Code Smells

- [ ] **No code duplication** - DRY principle
- [ ] **Functions have single responsibility**
- [ ] **No deeply nested code** (max 3-4 levels)
- [ ] **No god classes** (classes doing too much)
- [ ] **No magic numbers** - use named constants
  ```python
  # Good
  TAX_RATE = 0.08
  total = subtotal * (1 + TAX_RATE)

  # Bad
  total = subtotal * 1.08
  ```

- [ ] **Avoid mutable default arguments**
  ```python
  # Good
  def add_item(item: str, items: Optional[List[str]] = None) -> List[str]:
      if items is None:
          items = []
      items.append(item)
      return items

  # Bad - Dangerous!
  def add_item(item: str, items: List[str] = []) -> List[str]:
      items.append(item)  # Mutates the default list!
      return items
  ```

---

## 2. Performance Implications

### Algorithm Complexity

- [ ] **Analyze Big-O complexity** of critical functions
  ```python
  # O(n²) - Bad for large inputs
  def find_duplicates_slow(items: List[int]) -> List[int]:
      duplicates = []
      for i in range(len(items)):
          for j in range(i + 1, len(items)):
              if items[i] == items[j]:
                  duplicates.append(items[i])
      return duplicates

  # O(n) - Much better!
  def find_duplicates_fast(items: List[int]) -> List[int]:
      seen = set()
      duplicates = set()
      for item in items:
          if item in seen:
              duplicates.add(item)
          seen.add(item)
      return list(duplicates)
  ```

- [ ] **Avoid repeated calculations** in loops
  ```python
  # Good
  length = len(items)
  for i in range(length):
      process(items[i])

  # Bad - Calls len() every iteration
  for i in range(len(items)):
      process(items[i])
  ```

### Data Structures

- [ ] **Use appropriate data structures**
  ```python
  # Use set for membership testing (O(1) vs O(n))
  valid_ids = {1, 2, 3, 4, 5}  # Good
  valid_ids = [1, 2, 3, 4, 5]  # Bad for 'in' checks

  # Use dict for key-value lookups
  user_lookup = {user.id: user for user in users}  # Good

  # Use deque for queue operations
  from collections import deque
  queue = deque()  # Good for popleft()
  queue = []  # Bad - O(n) for pop(0)
  ```

- [ ] **Avoid list concatenation in loops**
  ```python
  # Good - O(n)
  result = []
  for item in items:
      result.append(processed(item))

  # Bad - O(n²)
  result = []
  for item in items:
      result = result + [processed(item)]
  ```

### Memory Efficiency

- [ ] **Use generators** for large datasets
  ```python
  # Good - Yields one at a time
  def read_large_file(path: str):
      with open(path) as f:
          for line in f:
              yield process(line)

  # Bad - Loads entire file in memory
  def read_large_file(path: str):
      with open(path) as f:
          return [process(line) for line in f]
  ```

- [ ] **Use `__slots__`** for classes with many instances
  ```python
  # Good - Saves memory for millions of instances
  class Point:
      __slots__ = ['x', 'y']

      def __init__(self, x: float, y: float):
          self.x = x
          self.y = y
  ```

- [ ] **Lazy evaluation** where possible
  ```python
  # Good - Only computes if needed
  def expensive_operation():
      return compute_heavy_stuff()

  result = expensive_operation() if condition else None

  # Better - Use property for truly lazy
  class DataProcessor:
      @property
      def expensive_data(self):
          if not hasattr(self, '_expensive_data'):
              self._expensive_data = load_expensive_data()
          return self._expensive_data
  ```

### I/O Operations

- [ ] **Batch database queries** instead of N+1
  ```python
  # Good - 1 query
  user_ids = [order.user_id for order in orders]
  users = User.objects.filter(id__in=user_ids)

  # Bad - N+1 queries
  for order in orders:
      user = User.objects.get(id=order.user_id)
  ```

- [ ] **Use connection pooling** for databases
- [ ] **Async I/O** for high-concurrency scenarios
  ```python
  import asyncio
  import aiohttp

  async def fetch_url(session, url):
      async with session.get(url) as response:
          return await response.text()

  async def fetch_all(urls):
      async with aiohttp.ClientSession() as session:
          tasks = [fetch_url(session, url) for url in urls]
          return await asyncio.gather(*tasks)
  ```

### Caching

- [ ] **functools.lru_cache** for expensive pure functions
  ```python
  from functools import lru_cache

  @lru_cache(maxsize=128)
  def fibonacci(n: int) -> int:
      if n < 2:
          return n
      return fibonacci(n - 1) + fibonacci(n - 2)
  ```

- [ ] **Redis/Memcached** for distributed caching
- [ ] **Property caching** for expensive attributes
  ```python
  from functools import cached_property

  class DataAnalyzer:
      @cached_property
      def expensive_calculation(self):
          return perform_heavy_computation(self.data)
  ```

---

## 3. Security Vulnerabilities

### Input Validation

- [ ] **Validate all external input**
  ```python
  # Good
  def create_user(email: str, age: int) -> User:
      if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', email):
          raise ValueError("Invalid email format")
      if not 0 < age < 150:
          raise ValueError("Invalid age")
      return User(email=email, age=age)

  # Bad - No validation
  def create_user(email: str, age: int) -> User:
      return User(email=email, age=age)
  ```

- [ ] **Sanitize user input** before use
  ```python
  import html

  # Good
  safe_text = html.escape(user_input)

  # Bad - XSS vulnerability
  output = f"<div>{user_input}</div>"
  ```

### SQL Injection Prevention

- [ ] **Use parameterized queries** (NEVER string formatting)
  ```python
  # Good - Safe from SQL injection
  cursor.execute(
      "SELECT * FROM users WHERE email = %s AND age > %s",
      (email, age)
  )

  # Bad - SQL injection vulnerability!
  cursor.execute(
      f"SELECT * FROM users WHERE email = '{email}' AND age > {age}"
  )
  ```

- [ ] **Use ORM** (SQLAlchemy, Django ORM) when possible
  ```python
  # Good - ORM handles escaping
  users = session.query(User).filter(
      User.email == email,
      User.age > age
  ).all()
  ```

### Authentication & Authorization

- [ ] **Never store plaintext passwords**
  ```python
  # Good
  from passlib.hash import pbkdf2_sha256

  hashed = pbkdf2_sha256.hash(password)
  pbkdf2_sha256.verify(password, hashed)

  # Bad
  user.password = password  # Plaintext storage!
  ```

- [ ] **Use secure session management**
  ```python
  # Good
  import secrets

  session_token = secrets.token_urlsafe(32)

  # Bad
  import random
  session_token = str(random.randint(1000, 9999))  # Predictable!
  ```

- [ ] **Implement rate limiting** for APIs
- [ ] **Check authorization** before sensitive operations
  ```python
  # Good
  def delete_user(user_id: int, requesting_user: User) -> None:
      if not requesting_user.is_admin:
          raise PermissionError("Admin access required")
      user = User.get(user_id)
      user.delete()
  ```

### Secrets Management

- [ ] **Never hardcode secrets**
  ```python
  # Good
  import os

  API_KEY = os.environ.get('API_KEY')
  if not API_KEY:
      raise EnvironmentError("API_KEY not set")

  # Bad
  API_KEY = "sk-1234567890abcdef"  # Hardcoded secret!
  ```

- [ ] **Use environment variables** or secret managers
- [ ] **.gitignore** for sensitive files
- [ ] **Rotate credentials** regularly

### Data Encryption

- [ ] **HTTPS for all communications**
- [ ] **Encrypt sensitive data at rest**
  ```python
  from cryptography.fernet import Fernet

  key = Fernet.generate_key()
  cipher = Fernet(key)

  encrypted = cipher.encrypt(sensitive_data.encode())
  decrypted = cipher.decrypt(encrypted).decode()
  ```

- [ ] **Use secure random** for cryptographic purposes
  ```python
  # Good
  import secrets

  token = secrets.token_bytes(32)

  # Bad - Not cryptographically secure
  import random
  token = bytes([random.randint(0, 255) for _ in range(32)])
  ```

### Common Vulnerabilities

- [ ] **Path traversal protection**
  ```python
  # Good
  from pathlib import Path

  def safe_read(filename: str) -> str:
      base_dir = Path('/safe/directory')
      file_path = (base_dir / filename).resolve()
      if not file_path.is_relative_to(base_dir):
          raise ValueError("Path traversal attempt detected")
      return file_path.read_text()

  # Bad - Path traversal vulnerability
  def unsafe_read(filename: str) -> str:
      return open(f"/safe/directory/{filename}").read()
  ```

- [ ] **Command injection prevention**
  ```python
  # Good
  import subprocess

  subprocess.run(['ls', '-l', user_dir], check=True)

  # Bad - Command injection!
  os.system(f"ls -l {user_dir}")
  ```

- [ ] **XML external entity (XXE) prevention**
- [ ] **CSRF protection** for state-changing operations
- [ ] **Avoid pickle** for untrusted data
  ```python
  # Good
  import json

  data = json.loads(untrusted_input)

  # Bad - Remote code execution risk!
  import pickle
  data = pickle.loads(untrusted_input)
  ```

---

## 4. Test Coverage & Quality

### Test Structure

- [ ] **AAA Pattern**: Arrange, Act, Assert
  ```python
  def test_user_creation():
      # Arrange
      email = "test@example.com"
      age = 25

      # Act
      user = create_user(email, age)

      # Assert
      assert user.email == email
      assert user.age == age
  ```

- [ ] **One assertion per test** (when practical)
  ```python
  # Good - Focused tests
  def test_user_email():
      user = create_user("test@example.com", 25)
      assert user.email == "test@example.com"

  def test_user_age():
      user = create_user("test@example.com", 25)
      assert user.age == 25

  # Acceptable - Related assertions
  def test_user_creation():
      user = create_user("test@example.com", 25)
      assert user.email == "test@example.com"
      assert user.age == 25
      assert user.is_active is True
  ```

- [ ] **Descriptive test names**
  ```python
  # Good
  def test_create_user_with_valid_email_succeeds():
      pass

  def test_create_user_with_invalid_email_raises_value_error():
      pass

  # Bad
  def test1():
      pass

  def test_user():
      pass
  ```

### Test Coverage

- [ ] **Aim for 80%+ code coverage**
  ```bash
  pytest --cov=myproject --cov-report=html
  ```

- [ ] **Critical paths at 100%** (auth, payments, security)
- [ ] **Test edge cases and boundary conditions**
  ```python
  def test_calculate_discount_edge_cases():
      assert calculate_discount(100, 0) == 100  # 0% discount
      assert calculate_discount(100, 100) == 0  # 100% discount
      assert calculate_discount(0, 50) == 0  # $0 price
  ```

- [ ] **Test error conditions**
  ```python
  def test_create_user_with_invalid_email_raises_error():
      with pytest.raises(ValueError, match="Invalid email"):
          create_user("invalid-email", 25)
  ```

### Test Quality

- [ ] **Tests are independent** (no test order dependency)
  ```python
  # Good - Each test sets up its own data
  def test_user_count():
      clear_database()
      create_user("test@example.com", 25)
      assert User.count() == 1
  ```

- [ ] **Tests are deterministic** (no random behavior)
  ```python
  # Good
  def test_random_selection():
      random.seed(42)  # Fixed seed for reproducibility
      result = select_random_items(items, 5)
      assert len(result) == 5
  ```

- [ ] **Fast unit tests** (< 100ms each)
- [ ] **Use mocks** for external dependencies
  ```python
  from unittest.mock import Mock, patch

  def test_fetch_user_data():
      with patch('requests.get') as mock_get:
          mock_get.return_value.json.return_value = {'id': 1}
          result = fetch_user_data(1)
          assert result['id'] == 1
          mock_get.assert_called_once()
  ```

### Test Types

- [ ] **Unit tests**: Test individual functions/methods
- [ ] **Integration tests**: Test component interactions
- [ ] **End-to-end tests**: Test complete user workflows
- [ ] **Property-based tests**: Use hypothesis for edge cases
  ```python
  from hypothesis import given
  from hypothesis.strategies import integers

  @given(integers(min_value=0, max_value=100))
  def test_discount_always_reduces_price(percentage):
      original = 100
      discounted = calculate_discount(original, percentage)
      assert 0 <= discounted <= original
  ```

### Test Fixtures

- [ ] **Use pytest fixtures** for common setup
  ```python
  import pytest

  @pytest.fixture
  def sample_user():
      return User(email="test@example.com", age=25)

  @pytest.fixture
  def database_session():
      session = create_session()
      yield session
      session.rollback()
      session.close()

  def test_save_user(database_session, sample_user):
      database_session.add(sample_user)
      database_session.commit()
      assert User.count() == 1
  ```

---

## 5. Documentation Completeness

### Docstrings

- [ ] **All public modules, classes, and functions** have docstrings
  ```python
  """
  Module for user authentication and authorization.

  This module provides functions for:
  - User registration and login
  - Password hashing and verification
  - Session management
  """

  class UserManager:
      """
      Manages user accounts and authentication.

      This class handles user creation, authentication, and
      account management operations.

      Attributes:
          db_session: Database session for persistence
          cache: Redis cache for session storage
      """

      def create_user(self, email: str, password: str) -> User:
          """
          Create a new user account.

          Args:
              email: User's email address (must be unique)
              password: Plain text password (will be hashed)

          Returns:
              User: Newly created user object

          Raises:
              ValueError: If email is invalid or already exists
              DatabaseError: If database operation fails

          Example:
              >>> manager = UserManager(session)
              >>> user = manager.create_user("test@example.com", "secret123")
              >>> print(user.email)
              test@example.com
          """
          pass
  ```

- [ ] **Google or NumPy docstring style** (be consistent)
  ```python
  # Google Style
  def function(arg1: int, arg2: str) -> bool:
      """
      Summary line.

      Extended description.

      Args:
          arg1: Description of arg1
          arg2: Description of arg2

      Returns:
          Description of return value

      Raises:
          ValueError: When something is invalid
      """
      pass

  # NumPy Style
  def function(arg1: int, arg2: str) -> bool:
      """
      Summary line.

      Extended description.

      Parameters
      ----------
      arg1 : int
          Description of arg1
      arg2 : str
          Description of arg2

      Returns
      -------
      bool
          Description of return value

      Raises
      ------
      ValueError
          When something is invalid
      """
      pass
  ```

### Comments

- [ ] **Why, not what**: Comments explain reasoning
  ```python
  # Good - Explains why
  # Using binary search because list is pre-sorted
  index = bisect.bisect_left(sorted_list, target)

  # Workaround for upstream bug #12345 - will be fixed in v2.0
  result = legacy_api.call() or fallback_method()

  # Bad - Obvious from code
  # Increment counter by 1
  counter += 1
  ```

- [ ] **TODOs include context**
  ```python
  # Good
  # TODO(username): Refactor to use async/await - Issue #123
  # TODO(username): Add caching layer - reduces load by 50%

  # Bad
  # TODO: fix this
  # TODO: optimize
  ```

- [ ] **No commented-out code** (use version control)

### README

- [ ] **Project overview and purpose**
- [ ] **Installation instructions**
- [ ] **Usage examples**
- [ ] **Configuration options**
- [ ] **Contributing guidelines**
- [ ] **License information**

### API Documentation

- [ ] **Generate with Sphinx** or similar tools
- [ ] **Include examples** for complex APIs
- [ ] **Version compatibility** notes
- [ ] **Deprecation warnings**
  ```python
  import warnings

  def old_function():
      """
      .. deprecated:: 2.0
          Use :func:`new_function` instead.
      """
      warnings.warn(
          "old_function is deprecated, use new_function",
          DeprecationWarning,
          stacklevel=2
      )
  ```

### Type Hints as Documentation

- [ ] **Type hints make intent clear**
  ```python
  # Clear contract without reading implementation
  def process_orders(
      orders: List[Order],
      filter_by_status: Optional[OrderStatus] = None,
      max_results: int = 100
  ) -> Tuple[List[Order], int]:
      """
      Process and filter orders.

      Returns:
          Tuple of (filtered_orders, total_count)
      """
      pass
  ```

---

## 6. Architectural Concerns

### SOLID Principles

- [ ] **Single Responsibility**: One class, one reason to change
  ```python
  # Good - Separate concerns
  class UserRepository:
      def save(self, user: User) -> None: pass
      def find_by_id(self, id: int) -> Optional[User]: pass

  class UserValidator:
      def validate_email(self, email: str) -> bool: pass
      def validate_age(self, age: int) -> bool: pass

  # Bad - Doing too much
  class User:
      def save_to_database(self): pass
      def send_welcome_email(self): pass
      def validate(self): pass
      def generate_report(self): pass
  ```

- [ ] **Open/Closed**: Open for extension, closed for modification
  ```python
  # Good - Use inheritance/composition
  from abc import ABC, abstractmethod

  class PaymentProcessor(ABC):
      @abstractmethod
      def process(self, amount: float) -> bool:
          pass

  class CreditCardProcessor(PaymentProcessor):
      def process(self, amount: float) -> bool:
          # Credit card logic
          pass

  class PayPalProcessor(PaymentProcessor):
      def process(self, amount: float) -> bool:
          # PayPal logic
          pass
  ```

- [ ] **Liskov Substitution**: Subtypes should be substitutable
- [ ] **Interface Segregation**: Many specific interfaces > one general
- [ ] **Dependency Inversion**: Depend on abstractions, not concretions
  ```python
  # Good - Dependency injection
  class UserService:
      def __init__(self, repository: UserRepository):
          self.repository = repository

  # Bad - Tight coupling
  class UserService:
      def __init__(self):
          self.repository = UserRepository()
  ```

### Design Patterns

- [ ] **Appropriate pattern usage**
  - Factory: Object creation
  - Singleton: Single instance (use sparingly)
  - Strategy: Interchangeable algorithms
  - Observer: Event notification
  - Decorator: Add behavior dynamically

- [ ] **Avoid anti-patterns**
  - God objects
  - Circular dependencies
  - Spaghetti code
  - Golden hammer (overusing one pattern)

### Code Organization

- [ ] **Logical module structure**
  ```
  myproject/
  ├── __init__.py
  ├── models/         # Data models
  ├── services/       # Business logic
  ├── repositories/   # Data access
  ├── controllers/    # API endpoints
  ├── utils/          # Utilities
  └── tests/          # Tests
  ```

- [ ] **Separation of concerns**: layers communicate through interfaces
- [ ] **Domain-driven design**: Model reflects business domain
- [ ] **Microservices boundaries**: Clear service responsibilities

### Scalability

- [ ] **Horizontal scaling** considerations
- [ ] **Database sharding** strategy
- [ ] **Caching layers** for read-heavy operations
- [ ] **Async processing** for long-running tasks
- [ ] **Message queues** (Celery, RabbitMQ) for background jobs

### Maintainability

- [ ] **Low coupling, high cohesion**
- [ ] **Clear naming** reflects purpose
- [ ] **Refactor complex code** (cyclomatic complexity < 10)
- [ ] **Remove dead code**
- [ ] **Version dependencies** (requirements.txt, poetry.lock)

---

## 7. Constructive Feedback Formatting

### Feedback Principles

**Be Specific and Actionable**
```markdown
❌ Bad: "This function is bad"
✅ Good: "This function has O(n²) complexity. Consider using a dictionary
         for O(n) lookup instead. See line 42."
```

**Explain the Why**
```markdown
❌ Bad: "Don't use mutable defaults"
✅ Good: "Mutable default arguments can cause unexpected behavior because
         they're shared across function calls. Use None and create a new
         list inside the function. Example: [link to docs]"
```

**Suggest Alternatives**
```markdown
❌ Bad: "This won't scale"
✅ Good: "This approach loads all records in memory. For large datasets,
         consider using pagination or a generator to stream results:

         def get_users():
             offset = 0
             while True:
                 users = query.limit(100).offset(offset).all()
                 if not users:
                     break
                 yield from users
                 offset += 100"
```

### Feedback Categories

**🔴 Critical (Must Fix)**
- Security vulnerabilities
- Data loss risks
- Breaking changes
- Production outages

**🟡 Important (Should Fix)**
- Performance issues
- Poor error handling
- Missing tests
- Architecture violations

**🟢 Suggestion (Nice to Have)**
- Code style improvements
- Better naming
- Refactoring opportunities
- Documentation enhancements

### Feedback Template

```markdown
## 🔴 Critical Issues

### SQL Injection Vulnerability (line 45)
**Problem**: Using string formatting for SQL queries allows injection attacks.

**Current Code**:
```python
query = f"SELECT * FROM users WHERE id = {user_id}"
```

**Recommended**:
```python
query = "SELECT * FROM users WHERE id = %s"
cursor.execute(query, (user_id,))
```

**Why**: Prevents malicious input from executing arbitrary SQL commands.

**Resources**: [OWASP SQL Injection](https://owasp.org/...)

---

## 🟡 Important Issues

### Missing Error Handling (line 78)
**Problem**: External API call has no error handling.

**Suggestion**: Wrap in try/except and handle timeout/connection errors.

**Example**:
```python
try:
    response = requests.get(url, timeout=5)
    response.raise_for_status()
except requests.Timeout:
    logger.error("API timeout")
    return fallback_value
except requests.RequestException as e:
    logger.error(f"API error: {e}")
    raise
```

---

## 🟢 Suggestions

### Consider List Comprehension (line 102)
**Current**: Using a for loop to build a list
**Suggestion**: More Pythonic with list comprehension

**Before**:
```python
result = []
for item in items:
    if item.is_valid():
        result.append(item.name)
```

**After**:
```python
result = [item.name for item in items if item.is_valid()]
```

**Benefit**: More concise and typically faster.
```

### Praise Good Practices

```markdown
## ✅ Great Work!

- **Excellent test coverage** (95% on new code)
- **Clean separation** of concerns with repository pattern
- **Good error handling** with specific exceptions
- **Type hints** make the API clear and self-documenting
- **Performance optimization** using caching reduced response time by 60%

Keep up the great work! 🎉
```

### Common Review Comments

**Performance**
```markdown
⚠️ **Performance Concern**: This nested loop has O(n²) complexity.

For large datasets, consider:
1. Using a set for O(1) lookups
2. Using a dictionary to group by key
3. Pre-sorting and using binary search

Would you like help implementing one of these approaches?
```

**Security**
```markdown
🔒 **Security Issue**: Password stored in plaintext

This is a critical security vulnerability. Please:
1. Use bcrypt or argon2 for password hashing
2. Never log or display passwords
3. Enforce password complexity requirements

Example using bcrypt:
```python
import bcrypt
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
```
```

**Testing**
```markdown
🧪 **Test Coverage**: Core logic needs tests

The `process_payment` function is missing tests. Please add:
1. Happy path test
2. Invalid input tests
3. External API failure tests

Example test structure:
```python
def test_process_payment_success():
    # Arrange: Create valid payment data
    # Act: Call process_payment
    # Assert: Verify payment was processed
```
```

**Documentation**
```markdown
📚 **Documentation**: Add docstring

Public functions should have docstrings explaining:
- What the function does
- Parameters and their types
- Return value
- Possible exceptions

Example:
```python
def calculate_tax(amount: float, tax_rate: float) -> float:
    """
    Calculate tax amount for a given price.

    Args:
        amount: Pre-tax price
        tax_rate: Tax rate as decimal (e.g., 0.08 for 8%)

    Returns:
        Tax amount rounded to 2 decimal places

    Raises:
        ValueError: If amount or tax_rate is negative
    """
```
```

---

## Code Review Workflow

### Before Reviewing

1. **Understand the context**: Read PR description and linked issues
2. **Check CI/CD**: Ensure tests pass and build succeeds
3. **Review scope**: Verify changes align with stated purpose
4. **Prepare mindset**: Be constructive, not critical

### During Review

1. **Read code**: Don't just skim - understand the logic
2. **Run locally**: Test functionality when possible
3. **Check tests**: Verify new code has appropriate tests
4. **Review documentation**: Ensure docs are updated
5. **Consider edge cases**: Think about what could go wrong

### Providing Feedback

1. **Start with positives**: Acknowledge good work
2. **Be specific**: Point to exact lines and issues
3. **Explain rationale**: Help them learn, don't just dictate
4. **Offer solutions**: Suggest concrete improvements
5. **Distinguish severity**: Critical vs nice-to-have
6. **Ask questions**: "Have you considered...?" vs "This is wrong"

### After Review

1. **Follow up**: Check if feedback was addressed
2. **Approve when ready**: Don't nitpick endlessly
3. **Document learnings**: Share insights with team
4. **Celebrate**: Recognize great work publicly

---

## Quick Reference Checklist

### Must Check
- [ ] No security vulnerabilities
- [ ] No SQL injection risks
- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] Error handling appropriate
- [ ] Tests cover new code
- [ ] Documentation updated
- [ ] No breaking changes (or documented)

### Should Check
- [ ] Follows PEP 8 style guide
- [ ] Type hints present
- [ ] Efficient algorithms (Big-O)
- [ ] Appropriate data structures
- [ ] Code is DRY (no duplication)
- [ ] Functions are focused (SRP)
- [ ] Naming is clear and consistent
- [ ] Comments explain why, not what

### Nice to Have
- [ ] Code could be more Pythonic
- [ ] Refactoring opportunities
- [ ] Performance optimizations possible
- [ ] Better abstractions available
- [ ] Additional tests would help

---

## Resources

### Style Guides
- [PEP 8](https://peps.python.org/pep-0008/)
- [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)
- [Black Code Formatter](https://black.readthedocs.io/)

### Security
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Python Security Best Practices](https://python.readthedocs.io/en/stable/library/security_warnings.html)
- [Bandit Security Linter](https://bandit.readthedocs.io/)

### Testing
- [pytest Documentation](https://docs.pytest.org/)
- [unittest Documentation](https://docs.python.org/3/library/unittest.html)
- [Hypothesis (Property Testing)](https://hypothesis.readthedocs.io/)

### Performance
- [Python Performance Tips](https://wiki.python.org/moin/PythonSpeed/PerformanceTips)
- [cProfile Profiler](https://docs.python.org/3/library/profile.html)

### Architecture
- [Design Patterns in Python](https://refactoring.guru/design-patterns/python)
- [Clean Code in Python](https://github.com/zedr/clean-code-python)

---

**Remember**: The goal of code review is to help the team write better code and learn together. Be kind, be thorough, and be constructive! 🚀
