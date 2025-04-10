// DOM Elements
const menuToggle = document.querySelector('.menu-toggle');
const navMenu = document.querySelector('.nav-menu');

// Toggle mobile menu
if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('show');
  });
}

// Get recommendations
async function getRecommendations() {
  try {
    const response = await fetch('/recommendations', {
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    const data = await response.json();
    
    if (data.success) {
      displayRecommendations(data.recommendations);
    } else {
      showAlert(data.message || 'Error loading recommendations', 'danger');
    }
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    showAlert('Error connecting to the server', 'danger');
  }
}

// Display recommendations
function displayRecommendations(recommendations) {
  console.log(recommendations);
  const container = document.getElementById('recommendations-container');
  if (!container) return;
  
  if (recommendations.length === 0) {
    container.innerHTML = '<p>Complete your preferences to get personalized recommendations!</p>';
    return;
  }
  
  let html = '';
  recommendations.forEach(destination => {
    html += `
      <div class="card recommendation-card">
        <div class="destination-content">
          <div class="recommendation-header">
            <span class="match-score">${destination.matchScore}%</span>
            <h3>${destination.name}</h3>
          </div>
          <p>${destination.description.substring(0, 150)}...</p>
          <div class="category-tags">
            ${destination.category.map(cat => `<span class="tag">${cat}</span>`).join('')}
          </div>
          <div class="destination-meta">
            <span>${destination.location.city}, ${destination.location.country}</span>
            <div class="rating">
              <span class="stars">★</span>
              <span>${destination.averageRating.toFixed(1)}</span>
            </div>
          </div>
          <button class="btn btn-primary btn-sm book-now" data-id="${destination._id}" data-name="${destination.name}">Book Now</button>
          <a href="/destinations/${destination._id}" class="btn btn-secondary btn-sm">View Details</a>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;

  // Attach event listeners for booking buttons
  attachBookingListeners();
}

// Attach event listeners to "Book Now" buttons
function attachBookingListeners() {
  document.querySelectorAll('.book-now').forEach(button => {
    button.addEventListener('click', function () {
      const destinationId = this.getAttribute('data-id');
      const destinationName = this.getAttribute('data-name');
      openBookingModal(destinationId, destinationName);
    });
  });
}

// Open Booking Modal
function openBookingModal(destinationId, destinationName) {
  const modal = document.getElementById('bookingModal');
  document.getElementById('bookingDestination').innerText = destinationName;
  document.getElementById('destinationId').value = destinationId;
  
  const modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();
}

// Handle booking form submission
document.getElementById('bookingForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const formData = new FormData(this);
  const response = await fetch('/bookings/create', {
    method: 'POST',
    body: new URLSearchParams(formData),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const result = await response.json();
  if (result.success) {
    showAlert('Booking Successful!', 'success');
    setTimeout(() => location.reload(), 2000);
  } else {
    showAlert('Booking Failed!', 'danger');
  }
});

// Show alert message
function showAlert(message, type = 'primary') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.appendChild(document.createTextNode(message));
  
  const container = document.querySelector('.container');
  const header = document.querySelector('.page-header');
  
  container.insertBefore(alertDiv, header.nextSibling);
  
  setTimeout(() => {
    document.querySelector('.alert').remove();
  }, 3000);
}

// Initialize page functionality
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('recommendations-container')) {
    getRecommendations();
  }
});

// Booking Modal HTML (Add this inside your main `index.ejs` or `layout.ejs` file)
