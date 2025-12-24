# Hospital Appointment Scheduler with Waiting Time Prediction

A full-stack web application for hospital appointment scheduling that uses machine learning to predict waiting times and suggest optimal appointment slots. The system helps hospitals optimize patient scheduling by predicting wait times based on various factors and recommending better time slots within a ±2 hour window.

## Features

- **Appointment Management**: Create, read, update, and delete appointments via REST API
- **Waiting Time Prediction**: ML-powered prediction using Random Forest model trained on historical data
- **Smart Slot Suggestions**: Automatically suggests better appointment times within ±2 hours if significant wait time reduction is possible
- **Dual Frontend Interfaces**:
  - Modern React web application for comprehensive appointment management
  - Simple HTML form for receptionists
- **Data Persistence**: CSV-based storage for appointments and patient data
- **Containerized Deployment**: Docker support for easy deployment
- **Kubernetes Ready**: Includes deployment manifests with Horizontal Pod Autoscaler
- **CORS Enabled**: Supports cross-origin requests for frontend integration

## Technology Stack

### Backend
- **FastAPI**: High-performance Python web framework
- **Scikit-learn**: Machine learning library for Random Forest model
- **Pandas**: Data manipulation and CSV handling
- **Joblib**: Model serialization
- **Uvicorn**: ASGI server for FastAPI

### Frontend
- **React**: Modern JavaScript library for building user interfaces
- **Material-UI**: React component library for consistent design
- **Axios**: HTTP client for API communication

### Infrastructure
- **Docker**: Containerization
- **Kubernetes**: Container orchestration with HPA
- **Python 3.11**: Runtime environment

## Prerequisites

Before running this application, make sure you have the following installed:

- **Python 3.11** or higher
- **Node.js 16** or higher (for React frontend)
- **Docker** (optional, for containerized deployment)
- **Kubernetes cluster** (optional, for production deployment)

## Installation and Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd hospital-appointment-scheduler
```

### 2. Backend Setup

#### Install Python Dependencies

```bash
pip install -r requirements.txt
```

#### Verify Model File

Ensure `waiting_time_model.joblib` is present in the root directory. This file contains the trained Random Forest model for waiting time prediction.

### 3. Frontend Setup

```bash
cd waiting-time-frontend
npm install
cd ..
```

## Running the Application

### Local Development

#### Start the Backend API

```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

#### Start the React Frontend

```bash
cd waiting-time-frontend
npm start
```

The React app will be available at `http://localhost:3000`

#### Access the Simple HTML Form

Open `http://localhost:8000/form` in your browser for the receptionist interface.

### Docker Deployment

#### Build and Run with Docker

```bash
# Build the Docker image
docker build -t hospital-scheduler .

# Run the container
docker run -p 8000:8000 hospital-scheduler
```

### Kubernetes Deployment

#### Deploy to Kubernetes Cluster

```bash
# Apply the deployment
kubectl apply -f deployment.yaml

# Apply the service
kubectl apply -f service.yaml

# Apply the horizontal pod autoscaler
kubectl apply -f hpa.yaml
```

#### Check Deployment Status

```bash
kubectl get pods
kubectl get services
kubectl get hpa
```

## API Documentation

The API provides the following endpoints:

### Appointments

- `GET /api/appointments` - List all appointments
- `GET /api/appointments/{id}` - Get specific appointment
- `POST /api/appointments` - Create new appointment
- `PUT /api/appointments/{id}` - Update appointment
- `DELETE /api/appointments/{id}` - Delete appointment

### Prediction

- `POST /predict_waiting_time` - Predict waiting time for given parameters

### Health Check

- `GET /healthz` - Health check endpoint

### HTML Interface

- `GET /form` - Receptionist form interface
- `POST /form` - Submit form data

## Usage

### Creating an Appointment

To create an appointment, send a POST request to `/api/appointments` with the following JSON payload:

```json
{
  "patient_name": "John Doe",
  "day_of_week": 1,
  "month": 12,
  "hour": 10,
  "days_between_schedule_and_visit": 7,
  "sex_encoded": 1,
  "age": 35.0
}
```

The API will:
1. Predict the waiting time for the requested slot
2. Check for better slots within ±2 hours
3. Return the appointment data with suggestions

### Prediction Parameters

- `day_of_week`: 0-6 (Monday=0, Sunday=6)
- `month`: 1-12
- `hour`: 8-17 (working hours)
- `days_between_schedule_and_visit`: Days between scheduling and visit
- `sex_encoded`: 0=Female, 1=Male
- `age`: Patient age in years

## Data Files

The application uses CSV files for data persistence:

- `appointments.csv`: Stores appointment records
- `patients.csv`: Patient information
- `slots.csv`: Available time slots

## Machine Learning Model

The waiting time prediction uses a Random Forest model trained on historical hospital data. The model considers:

- Day of the week
- Month
- Hour of appointment
- Days between scheduling and visit
- Patient gender
- Patient age

## Development

### Running Tests

```bash
# Backend tests (if implemented)
pytest

# Frontend tests
cd waiting-time-frontend
npm test
```

### Code Structure

```
├── app.py                      # FastAPI application
├── requirements.txt            # Python dependencies
├── Dockerfile                  # Docker configuration
├── deployment.yaml             # Kubernetes deployment
├── service.yaml                # Kubernetes service
├── hpa.yaml                    # Horizontal Pod Autoscaler
├── waiting_time_model.joblib   # ML model
├── templates/
│   └── form.html              # HTML form template
├── waiting-time-frontend/      # React application
│   ├── src/
│   │   ├── App.js
│   │   └── ...
│   └── package.json
└── *.csv                      # Data files
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues, please open an issue in the GitHub repository.
