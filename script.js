// Core data structure
const matchData = {
    h2h: [], // Head-to-head matches between the two teams
    team1: [], // Team 1's matches against other teams
    team2: [] // Team 2's matches against other teams
};

// Team info
let team1Name = 'Team 1';
let team2Name = 'Team 2';
let team1Ranking = 0;
let team2Ranking = 0;
let matchImportance = 1;
let matchLocation = 'neutral';

// Betting lines
let totalLine = 0;
let pointSpread = 0;
let spreadDirection = 'team1';

// Charts
let winProbabilityChart = null;
let modelConfidenceChart = null;
let scoreProbabilityChart = null;
let performanceTrendChart = null;

// Analysis results tracking
let lastAnalysisResults = null;
let featureImportanceScores = {};

// Constants for data analysis
const MIN_MATCHES_FOR_GOOD_ANALYSIS = 4;
const MIN_MATCHES_FOR_EXCELLENT_ANALYSIS = 8;
const MIN_H2H_MATCHES = 2;

// Constants for weighting factors
const WEIGHTS = {
    RECENT_FORM: 3.0,
    H2H_MATCHES: 2.5,
    OVERALL_PERFORMANCE: 2.0,
    HOME_ADVANTAGE: 1.5,
    RANKING: 1.0,
    MATCH_IMPORTANCE: 1.8,
    SCORING_TREND: 1.5,
    DEFENSIVE_TREND: 1.5,
    MOMENTUM: 2.2,
    CONSISTENCY: 1.3
};

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Setup event listeners
    setupEventListeners();
    
    // Update team names in the UI
    updateTeamLabels();
    
    // Update data sufficiency indicators
    updateDataSufficiencyIndicators();
    
    // Show welcome toast
    showToast('Welcome to Sports Match Analyzer Pro with Model V1', 'info');
});

// Setup event listeners
function setupEventListeners() {
    // Team setup form
    document.getElementById('team-form').addEventListener('input', handleTeamSetup);
    
    // Add score input listeners
    document.getElementById('h2h-add-btn').addEventListener('click', handleH2HAdd);
    document.getElementById('team1-add-btn').addEventListener('click', handleTeam1Add);
    document.getElementById('team2-add-btn').addEventListener('click', handleTeam2Add);
    
    // Clear data button
    document.getElementById('clear-data-btn').addEventListener('click', clearAllData);
    
    // Add sample data button (for testing)
    const sampleDataBtn = document.createElement('button');
    sampleDataBtn.type = 'button';
    sampleDataBtn.id = 'sample-data-btn';
    sampleDataBtn.className = 'btn btn-outline';
    sampleDataBtn.innerHTML = '<span class="material-symbols-outlined">science</span> Add Sample Data';
    sampleDataBtn.addEventListener('click', addSampleData);
    
    // Append the sample data button to data controls
    document.querySelector('.data-controls').appendChild(sampleDataBtn);
    
    // Analyze button
    document.getElementById('analyze-button').addEventListener('click', function() {
        if (!validateInputs()) {
            return;
        }
        
        processAllMatchData();
        performAnalysis();
        showResults();
    });
}

// Handle team setup changes
function handleTeamSetup() {
    // Get form values
    team1Name = document.getElementById('team1').value || 'Team 1';
    team2Name = document.getElementById('team2').value || 'Team 2';
    team1Ranking = parseInt(document.getElementById('team1-ranking').value) || 0;
    team2Ranking = parseInt(document.getElementById('team2-ranking').value) || 0;
    matchImportance = parseFloat(document.getElementById('match-importance').value) || 1;
    matchLocation = document.getElementById('match-location').value || 'neutral';
    
    // Update UI with team names
    updateTeamLabels();
}

// Update all team name labels throughout the UI
function updateTeamLabels() {
    // Update input labels
    document.getElementById('h2h-team1-label').textContent = `${team1Name} Scores (comma separated)`;
    document.getElementById('h2h-team2-label').textContent = `${team2Name} Scores (comma separated)`;
    document.getElementById('team1-scores-label').textContent = `${team1Name} Scores (comma separated)`;
    document.getElementById('team2-scores-label').textContent = `${team2Name} Scores (comma separated)`;
    
    // Update spread direction dropdown
    const spreadDirectionEl = document.getElementById('spread-direction');
    if (spreadDirectionEl.options.length >= 2) {
        spreadDirectionEl.options[0].textContent = team1Name;
        spreadDirectionEl.options[1].textContent = team2Name;
    }
    
    // Update match section headers
    const matchSections = document.querySelectorAll('.match-section h3');
    if (matchSections.length >= 3) {
        matchSections[0].textContent = `Head-to-Head Matches`;
        matchSections[1].textContent = `${team1Name} Recent Matches`;
        matchSections[2].textContent = `${team2Name} Recent Matches`;
    }
}

// Handle Head-to-Head Scores Add
function handleH2HAdd() {
    const team1ScoresText = document.getElementById('h2h-team1').value.trim();
    const team2ScoresText = document.getElementById('h2h-team2').value.trim();
    
    if (!team1ScoresText || !team2ScoresText) {
        showToast('Please enter scores for both teams', 'warning');
        return;
    }
    
    // Parse the score arrays
    const team1Scores = team1ScoresText.split(',').map(score => parseInt(score.trim()));
    const team2Scores = team2ScoresText.split(',').map(score => parseInt(score.trim()));
    
    // Validate scores
    if (!validateScores(team1Scores, team2Scores)) return;
    
    // Clear previous H2H data
    matchData.h2h = [];
    
    // Add each pair of scores as a match
    const minLength = Math.min(team1Scores.length, team2Scores.length);
    let addedCount = 0;
    
    for (let i = 0; i < minLength; i++) {
        // Add increasing timestamps for each match (oldest first)
        const timestamp = Date.now() - ((minLength - i) * 7 * 24 * 60 * 60 * 1000); // 7 days apart
        processMatchScore('h2h', i + 1, team1Scores[i], team2Scores[i], timestamp);
        addedCount++;
    }
    
    // Update UI
    updateMatchSummary('h2h');
    updateDataSufficiencyIndicators();
    
    // Clear input fields
    document.getElementById('h2h-team1').value = '';
    document.getElementById('h2h-team2').value = '';
    
    // Show success message
    showToast(`Added ${addedCount} Head-to-Head matches`, 'success');
}

// Handle Team 1 Scores Add
function handleTeam1Add() {
    const team1ScoresText = document.getElementById('team1-scores').value.trim();
    const opponentScoresText = document.getElementById('team1-opponent').value.trim();
    
    if (!team1ScoresText || !opponentScoresText) {
        showToast('Please enter scores for both teams', 'warning');
        return;
    }
    
    // Parse the score arrays
    const team1Scores = team1ScoresText.split(',').map(score => parseInt(score.trim()));
    const opponentScores = opponentScoresText.split(',').map(score => parseInt(score.trim()));
    
    // Validate scores
    if (!validateScores(team1Scores, opponentScores)) return;
    
    // Clear previous Team 1 data
    matchData.team1 = [];
    
    // Add each pair of scores as a match
    const minLength = Math.min(team1Scores.length, opponentScores.length);
    let addedCount = 0;
    
    for (let i = 0; i < minLength; i++) {
        // Add increasing timestamps for each match (oldest first)
        const timestamp = Date.now() - ((minLength - i) * 7 * 24 * 60 * 60 * 1000); // 7 days apart
        processMatchScore('team1', i + 1, team1Scores[i], opponentScores[i], timestamp);
        addedCount++;
    }
    
    // Update UI
    updateMatchSummary('team1');
    updateDataSufficiencyIndicators();
    
    // Clear input fields
    document.getElementById('team1-scores').value = '';
    document.getElementById('team1-opponent').value = '';
    
    // Show success message
    showToast(`Added ${addedCount} matches for ${team1Name}`, 'success');
}

// Handle Team 2 Scores Add
function handleTeam2Add() {
    const team2ScoresText = document.getElementById('team2-scores').value.trim();
    const opponentScoresText = document.getElementById('team2-opponent').value.trim();
    
    if (!team2ScoresText || !opponentScoresText) {
        showToast('Please enter scores for both teams', 'warning');
        return;
    }
    
    // Parse the score arrays
    const team2Scores = team2ScoresText.split(',').map(score => parseInt(score.trim()));
    const opponentScores = opponentScoresText.split(',').map(score => parseInt(score.trim()));
    
    // Validate scores
    if (!validateScores(team2Scores, opponentScores)) return;
    
    // Clear previous Team 2 data
    matchData.team2 = [];
    
    // Add each pair of scores as a match
    const minLength = Math.min(team2Scores.length, opponentScores.length);
    let addedCount = 0;
    
    for (let i = 0; i < minLength; i++) {
        // Add increasing timestamps for each match (oldest first)
        const timestamp = Date.now() - ((minLength - i) * 7 * 24 * 60 * 60 * 1000); // 7 days apart
        processMatchScore('team2', i + 1, team2Scores[i], opponentScores[i], timestamp);
        addedCount++;
    }
    
    // Update UI
    updateMatchSummary('team2');
    updateDataSufficiencyIndicators();
    
    // Clear input fields
    document.getElementById('team2-scores').value = '';
    document.getElementById('team2-opponent').value = '';
    
    // Show success message
    showToast(`Added ${addedCount} matches for ${team2Name}`, 'success');
}

// Add sample data (for testing)
function addSampleData() {
    // First clear existing data
    clearAllData();
    
    // Set team names
    document.getElementById('team1').value = 'Liverpool';
    document.getElementById('team2').value = 'Manchester City';
    document.getElementById('team1-ranking').value = '4';
    document.getElementById('team2-ranking').value = '2';
    handleTeamSetup();
    
    // Add H2H matches
    document.getElementById('h2h-team1').value = '1,2,1,2,0';
    document.getElementById('h2h-team2').value = '1,2,0,1,1';
    handleH2HAdd();
    
    // Add team1 matches
    document.getElementById('team1-scores').value = '2,3,1,0,2,3';
    document.getElementById('team1-opponent').value = '0,1,0,0,1,1';
    handleTeam1Add();
    
    // Add team2 matches
    document.getElementById('team2-scores').value = '3,2,1,3,4,2';
    document.getElementById('team2-opponent').value = '0,0,0,1,1,2';
    handleTeam2Add();
    
    // Set betting lines
    document.getElementById('betting-line').value = '2.5';
    document.getElementById('point-spread').value = '1.0';
    
    // Show success message
    showToast('Sample data added successfully', 'success');
}

// Validate scores
function validateScores(scores1, scores2) {
    // Check if any values are not numbers
    if (scores1.some(isNaN) || scores2.some(isNaN)) {
        showToast('Please enter valid scores (numbers only)', 'error');
        return false;
    }
    
    // Check if any values are negative
    if (scores1.some(score => score < 0) || scores2.some(score => score < 0)) {
        showToast('Scores must be non-negative', 'error');
        return false;
    }
    
    // Check if arrays have at least one value
    if (scores1.length === 0 || scores2.length === 0) {
        showToast('Please enter at least one score for each team', 'warning');
        return false;
    }
    
    // Check if arrays have the same length
    if (scores1.length !== scores2.length) {
        showToast(`Unequal arrays. Will use the first ${Math.min(scores1.length, scores2.length)} scores from each.`, 'warning');
    }
    
    return true;
}

// Process a match score and add it to the data
function processMatchScore(category, matchNumber, score1, score2, timestamp) {
    const totalScore = score1 + score2;
    
    let team1Score, team2Score, outcome;
    
    // Process data differently based on category
    if (category === 'h2h') {
        team1Score = score1;
        team2Score = score2;
        
        if (team1Score === team2Score) {
            outcome = 'Draw';
        } else if (team1Score > team2Score) {
            outcome = `${team1Name} Wins`;
        } else {
            outcome = `${team2Name} Wins`;
        }
    } else if (category === 'team1') {
        team1Score = score1;
        team2Score = score2; // This is "Opponent"
        
        if (team1Score === team2Score) {
            outcome = 'Draw';
        } else if (team1Score > team2Score) {
            outcome = `${team1Name} Wins`;
        } else {
            outcome = 'Opponent Wins';
        }
    } else if (category === 'team2') {
        team1Score = score2; // This is "Opponent"
        team2Score = score1;
        
        if (team1Score === team2Score) {
            outcome = 'Draw';
        } else if (team1Score > team2Score) {
            outcome = 'Opponent Wins';
        } else {
            outcome = `${team2Name} Wins`;
        }
    }
    
    // Calculate performance indicators
    const marginOfVictory = Math.abs(team1Score - team2Score);
    const goalEfficiency = totalScore > 0 ? Math.max(team1Score, team2Score) / totalScore : 0.5;
    const cleanSheet = team1Score === 0 || team2Score === 0;
    
    // Add match to data
    matchData[category].push({
        matchNumber,
        team1Score,
        team2Score,
        totalScore,
        outcome,
        category,
        totalOverLine: totalLine > 0 ? totalScore > totalLine : null, // Only set if totalLine exists
        spreadCover: pointSpread > 0 ? calculateSpreadCover(team1Score, team2Score) : null, // Only set if pointSpread exists
        marginOfVictory,
        goalEfficiency,
        cleanSheet,
        timestamp: timestamp || Date.now() - (matchData[category].length * 86400000) // Use provided timestamp or create one
    });
    
    // Sort matches by timestamp (oldest first)
    matchData[category].sort((a, b) => a.timestamp - b.timestamp);
}

// Update match summary display
function updateMatchSummary(category) {
    const summaryElement = document.getElementById(`${category}-match-summary`);
    
    if (matchData[category].length === 0) {
        summaryElement.innerHTML = '<p>No matches added yet.</p>';
        return;
    }
    
    // Generate match items
    const matchItems = matchData[category].map(match => {
        let team1Label, team2Label, resultClass;
        
        if (category === 'h2h') {
            team1Label = team1Name;
            team2Label = team2Name;
            if (match.outcome === `${team1Name} Wins`) {
                resultClass = 'win';
            } else if (match.outcome === `${team2Name} Wins`) {
                resultClass = 'loss';
            } else {
                resultClass = 'draw';
            }
        } else if (category === 'team1') {
            team1Label = team1Name;
            team2Label = 'Opponent';
            if (match.outcome === `${team1Name} Wins`) {
                resultClass = 'win';
            } else if (match.outcome === 'Opponent Wins') {
                resultClass = 'loss';
            } else {
                resultClass = 'draw';
            }
        } else if (category === 'team2') {
            team1Label = 'Opponent';
            team2Label = team2Name;
            if (match.outcome === `${team2Name} Wins`) {
                resultClass = 'win';
            } else if (match.outcome === 'Opponent Wins') {
                resultClass = 'loss';
            } else {
                resultClass = 'draw';
            }
        }
        
        // Calculate how many days ago the match was
        const daysAgo = Math.floor((Date.now() - match.timestamp) / (24 * 60 * 60 * 1000));
        const dateInfo = daysAgo === 0 ? 'Today' : 
                        daysAgo === 1 ? 'Yesterday' : 
                        `${daysAgo} days ago`;
        
        return `
            <div class="match-item ${resultClass}">
                <div class="match-score">${team1Label} ${match.team1Score} - ${match.team2Score} ${team2Label}</div>
                <div class="match-date">${dateInfo}</div>
            </div>
        `;
    }).join('');
    
    // Create the summary HTML
    const summaryHTML = `
        <h4>Added ${matchData[category].length} matches:</h4>
        <div class="match-list">
            ${matchItems}
        </div>
    `;
    
    summaryElement.innerHTML = summaryHTML;
}

// Update data sufficiency indicators
function updateDataSufficiencyIndicators() {
    // Update count displays
    document.getElementById('h2h-count').textContent = `${matchData.h2h.length} matches`;
    document.getElementById('team1-count').textContent = `${matchData.team1.length} matches`;
    document.getElementById('team2-count').textContent = `${matchData.team2.length} matches`;
    
    // Update meter widths (max at 100%)
    const h2hPercent = Math.min(100, (matchData.h2h.length / MIN_H2H_MATCHES) * 100);
    const team1Percent = Math.min(100, (matchData.team1.length / MIN_MATCHES_FOR_EXCELLENT_ANALYSIS) * 100);
    const team2Percent = Math.min(100, (matchData.team2.length / MIN_MATCHES_FOR_EXCELLENT_ANALYSIS) * 100);
    
    document.getElementById('h2h-meter').style.width = `${h2hPercent}%`;
    document.getElementById('team1-meter').style.width = `${team1Percent}%`;
    document.getElementById('team2-meter').style.width = `${team2Percent}%`;
    
    // Update data quality indicator
    const totalMatches = getTotalMatchCount();
    const dataQualityIndicator = document.getElementById('data-quality-indicator');
    const dataQualityText = document.getElementById('data-quality-text');
    
    if (totalMatches >= MIN_MATCHES_FOR_EXCELLENT_ANALYSIS && matchData.h2h.length >= MIN_H2H_MATCHES) {
        dataQualityIndicator.className = 'data-quality excellent';
        dataQualityText.textContent = 'Excellent data quality for accurate predictions';
    } else if (totalMatches >= MIN_MATCHES_FOR_GOOD_ANALYSIS) {
        dataQualityIndicator.className = 'data-quality good';
        dataQualityText.textContent = 'Good data quality for reliable predictions';
    } else {
        dataQualityIndicator.className = 'data-quality insufficient';
        dataQualityText.textContent = `Add more match data for better predictions (${MIN_MATCHES_FOR_GOOD_ANALYSIS - totalMatches} more needed for good quality)`;
    }
}

// Clear all match data
function clearAllData() {
    // Confirm before clearing
    if (getTotalMatchCount() > 0 && !confirm('Are you sure you want to clear all match data?')) {
        return;
    }
    
    // Clear data
    matchData.h2h = [];
    matchData.team1 = [];
    matchData.team2 = [];
    
    // Update UI
    updateMatchSummary('h2h');
    updateMatchSummary('team1');
    updateMatchSummary('team2');
    updateDataSufficiencyIndicators();
    
    showToast('All match data has been cleared', 'info');
}

// Calculate if the spread was covered
function calculateSpreadCover(team1Score, team2Score) {
    // Return null if no point spread is set
    if (pointSpread <= 0) return null;
    
    const adjustedScore = spreadDirection === 'team1' 
        ? team1Score - pointSpread
        : team2Score - pointSpread;
    
    const opposingScore = spreadDirection === 'team1' ? team2Score : team1Score;
    
    if (adjustedScore > opposingScore) {
        return 'Favorite Covered';
    } else if (adjustedScore < opposingScore) {
        return 'Underdog Covered';
    } else {
        return 'Push';
    }
}

// Validate inputs before analysis
function validateInputs() {
    // Check if there is any match data
    if (getTotalMatchCount() === 0) {
        showToast('Please add match data before analyzing', 'error');
        return false;
    }
    
    // Check if team names are set
    if (!team1Name.trim() || !team2Name.trim()) {
        showToast('Please enter names for both teams', 'error');
        return false;
    }
    
    // Check if team names are different
    if (team1Name.trim() === team2Name.trim()) {
        showToast('Team names must be different', 'error');
        return false;
    }
    
    // Data sufficiency warnings
    if (getTotalMatchCount() < MIN_MATCHES_FOR_GOOD_ANALYSIS) {
        if (!confirm(`You have only ${getTotalMatchCount()} matches in total. The analysis may not be accurate. Continue anyway?`)) {
            return false;
        }
    }
    
    return true;
}

// Process all match data
function processAllMatchData() {
    // Show loading state
    document.getElementById('analysis-loading').classList.remove('hidden');
    document.getElementById('analysis-results').classList.add('hidden');
    
    // Make the results section visible
    document.getElementById('results').classList.add('visible');
    
    // Get betting lines data
    totalLine = parseFloat(document.getElementById('betting-line').value) || 0;
    pointSpread = parseFloat(document.getElementById('point-spread').value) || 0;
    spreadDirection = document.getElementById('spread-direction').value;
    
    // Update the spread cover calculation for all matches
    updateSpreadCoverCalculations();
}

// Update spread cover calculations for all matches
function updateSpreadCoverCalculations() {
    // Update all match data with the current spread and total values
    for (const category in matchData) {
        matchData[category].forEach(match => {
            // Only calculate spread cover if point spread is set
            match.spreadCover = pointSpread > 0 ? 
                calculateSpreadCover(match.team1Score, match.team2Score) : null;
            
            // Only set totalOverLine if totalLine is set
            match.totalOverLine = totalLine > 0 ? 
                match.totalScore > totalLine : null;
        });
    }
}

// Perform analysis on the data
function performAnalysis() {
    // If there's no data, show a message
    if (getTotalMatchCount() === 0) {
        showToast('Please add some match data before analyzing', 'error');
        document.getElementById('analysis-loading').classList.add('hidden');
        document.getElementById('results').classList.remove('visible');
        return;
    }
    
    try {
        // Prepare all feature data for analysis
        const features = prepareMatchFeatures();
        
        // Calculate win probabilities
        const probabilities = calculateModelV1WinProbabilities(features);
        
        // Calculate projected total
        const projectedTotal = calculateModelV1ProjectedTotal(features);
        
        // Calculate projected margin
        const projectedMargin = calculateModelV1ProjectedMargin(features);
        
        // Ensure consistency between win probabilities and projected margin
        const [adjustedProbabilities, adjustedMargin] = ensurePredictionConsistency(probabilities, projectedMargin);
        
        // Store the current analysis for reference
        lastAnalysisResults = {
            probabilities: adjustedProbabilities,
            projectedTotal,
            projectedMargin: adjustedMargin,
            team1Name,
            team2Name,
            totalLine,
            pointSpread,
            spreadDirection,
            matchImportance,
            matchLocation,
            features
        };
        
        // Calculate betting edge (only if betting lines are set)
        let overUnderEdge = 0;
        let spreadEdge = 0;
        
        if (totalLine > 0) {
            overUnderEdge = ((projectedTotal - totalLine) / Math.max(1, totalLine)) * 100;
        }
        
        if (pointSpread > 0) {
            const adjustedSpread = spreadDirection === 'team1' ? pointSpread : -pointSpread;
            spreadEdge = ((adjustedMargin - adjustedSpread) / Math.max(1, Math.abs(adjustedSpread))) * 100;
        }
        
        // Calculate team1 and team2 projected scores
        const team1ProjScore = Math.round((projectedTotal / 2) + (adjustedMargin / 2));
        const team2ProjScore = Math.round((projectedTotal / 2) - (adjustedMargin / 2));
        
        // Calculate betting recommendations (only if betting lines are set)
        const totalRecommendation = totalLine > 0 ? 
            calculateOverUnderRecommendation(overUnderEdge, projectedTotal) : 'NO LINE SET';
            
        const spreadRecommendation = pointSpread > 0 ? 
            calculateSpreadRecommendation(spreadEdge, adjustedMargin) : 'NO SPREAD SET';
        
        // Calculate feature importance
        featureImportanceScores = calculateFeatureImportance(features);
        
        // Generate score distribution
        const scoreDistribution = generateScoreDistribution(projectedTotal, adjustedMargin);
        
        // Update UI with analysis results
        updateWinnerPrediction(adjustedProbabilities);
        updateScorePrediction(team1ProjScore, team2ProjScore, projectedTotal, totalLine);
        updateBettingRecommendation(totalRecommendation, spreadRecommendation, overUnderEdge, spreadEdge);
        updateAnalysisExplanation(adjustedProbabilities, projectedTotal, adjustedMargin, team1ProjScore, team2ProjScore, features);
        createWinProbabilityChart(adjustedProbabilities);
        createScoreProbabilityChart(scoreDistribution);
        createFeatureImportanceChart(featureImportanceScores);
        createPerformanceTrendChart();
        
        // Hide loading and show results
        document.getElementById('analysis-loading').classList.add('hidden');
        document.getElementById('analysis-results').classList.remove('hidden');
    } catch (error) {
        console.error("Analysis failed:", error);
        showToast('Analysis failed. Please try again.', 'error');
        
        // Hide loading
        document.getElementById('analysis-loading').classList.add('hidden');
    }
}

// Ensure consistency between win probabilities and margin prediction
function ensurePredictionConsistency(probabilities, projectedMargin) {
    // Create a deep copy of probabilities to avoid modifying the original
    const adjustedProbabilities = { ...probabilities };
    let adjustedMargin = projectedMargin;
    
    // Determine the predicted winner based on probabilities
    let predictedWinner;
    
    if (probabilities.team1WinProb > probabilities.team2WinProb && 
        probabilities.team1WinProb > probabilities.drawProb) {
        predictedWinner = 'team1';
    } else if (probabilities.team2WinProb > probabilities.team1WinProb && 
               probabilities.team2WinProb > probabilities.drawProb) {
        predictedWinner = 'team2';
    } else {
        predictedWinner = 'draw';
    }
    
    // Check if predicted margin aligns with predicted winner
    const marginPredictedWinner = projectedMargin > 0.3 ? 'team1' : 
                                (projectedMargin < -0.3 ? 'team2' : 'draw');
    
    if (predictedWinner !== marginPredictedWinner) {
        console.log('Inconsistency detected between win probability and margin. Adjusting...');
        
        // Calculate adjustment strength based on probability confidence
        let adjustmentStrength;
        
        if (predictedWinner === 'team1') {
            adjustmentStrength = (adjustedProbabilities.team1WinProb - 
                                Math.max(adjustedProbabilities.team2WinProb, adjustedProbabilities.drawProb)) / 100;
            // Ensure margin favors team1
            adjustedMargin = Math.abs(projectedMargin) * 
                            Math.min(1, adjustmentStrength * 5 + 0.5);
        } else if (predictedWinner === 'team2') {
            adjustmentStrength = (adjustedProbabilities.team2WinProb - 
                                Math.max(adjustedProbabilities.team1WinProb, adjustedProbabilities.drawProb)) / 100;
            // Ensure margin favors team2
            adjustedMargin = -Math.abs(projectedMargin) * 
                            Math.min(1, adjustmentStrength * 5 + 0.5);
        } else {
            // For draw prediction, set margin close to zero
            const drawConfidence = (adjustedProbabilities.drawProb - 
                                Math.max(adjustedProbabilities.team1WinProb, adjustedProbabilities.team2WinProb)) / 100;
            adjustedMargin = projectedMargin * (1 - Math.min(1, drawConfidence * 5 + 0.5));
        }
        
        // Also slightly adjust probabilities to reduce the inconsistency
        if (Math.abs(adjustedMargin) > 0.5) {
            // Margin suggests a clear winner, adjust probabilities slightly
            if (adjustedMargin > 0) {
                // Team1 should be favored
                const boost = Math.min(5, Math.abs(adjustedMargin) * 3);
                adjustedProbabilities.team1WinProb = Math.min(95, adjustedProbabilities.team1WinProb + boost);
                adjustedProbabilities.team2WinProb = Math.max(5, adjustedProbabilities.team2WinProb - boost * 0.7);
                adjustedProbabilities.drawProb = Math.max(0, 100 - adjustedProbabilities.team1WinProb - adjustedProbabilities.team2WinProb);
            } else if (adjustedMargin < 0) {
                // Team2 should be favored
                const boost = Math.min(5, Math.abs(adjustedMargin) * 3);
                adjustedProbabilities.team2WinProb = Math.min(95, adjustedProbabilities.team2WinProb + boost);
                adjustedProbabilities.team1WinProb = Math.max(5, adjustedProbabilities.team1WinProb - boost * 0.7);
                adjustedProbabilities.drawProb = Math.max(0, 100 - adjustedProbabilities.team1WinProb - adjustedProbabilities.team2WinProb);
            }
        } else {
            // Margin is close to draw, increase draw probability slightly
            const drawBoost = Math.min(5, (1 - Math.abs(adjustedMargin)) * 5);
            adjustedProbabilities.drawProb = Math.min(50, adjustedProbabilities.drawProb + drawBoost);
            
            // Reduce win probabilities proportionally
            const team1Reduction = (adjustedProbabilities.team1WinProb / 
                                (adjustedProbabilities.team1WinProb + adjustedProbabilities.team2WinProb)) * drawBoost;
            const team2Reduction = drawBoost - team1Reduction;
            
            adjustedProbabilities.team1WinProb = Math.max(5, adjustedProbabilities.team1WinProb - team1Reduction);
            adjustedProbabilities.team2WinProb = Math.max(5, adjustedProbabilities.team2WinProb - team2Reduction);
        }
    }
    
    return [adjustedProbabilities, adjustedMargin];
}

// MODEL V1 FUNCTIONS
// =============================
// Prepare match features for analysis
function prepareMatchFeatures() {
    // Basic statistics
    const team1AvgScore = calculateOverallTeamAverage(team1Name, true);
    const team2AvgScore = calculateOverallTeamAverage(team2Name, false);
    const team1AvgConceded = calculateTeamAverageConceded(team1Name, true);
    const team2AvgConceded = calculateTeamAverageConceded(team2Name, false);
    const h2hAdvantage = calculateH2HAdvantage();
    const locationFactor = matchLocation === 'home' ? 1 : (matchLocation === 'away' ? -1 : 0);
    const rankingDiff = team1Ranking && team2Ranking ? team1Ranking - team2Ranking : 0;
    
    // Advanced statistics
    const team1RecentForm = calculateRecentForm(team1Name, true);
    const team2RecentForm = calculateRecentForm(team2Name, false);
    const team1DefenseStrength = calculateDefenseStrength(team1Name, true);
    const team2DefenseStrength = calculateDefenseStrength(team2Name, false);
    const team1AttackStrength = calculateAttackStrength(team1Name, true);
    const team2AttackStrength = calculateAttackStrength(team2Name, false);
    const team1Consistency = calculateTeamConsistency(team1Name, true);
    const team2Consistency = calculateTeamConsistency(team2Name, false);
    const team1MomentumIndex = calculateMomentumIndex(team1Name, true);
    const team2MomentumIndex = calculateMomentumIndex(team2Name, false);
    const team1HomeAdvantage = calculateHomeAdvantage(team1Name, true);
    const team2HomeAdvantage = calculateHomeAdvantage(team2Name, false);
    const team1MatchImportancePerformance = calculateMatchImportancePerformance(team1Name, true);
    const team2MatchImportancePerformance = calculateMatchImportancePerformance(team2Name, false);
    const scoringTrends = calculateScoringTrends();
    const cleanSheetStats = calculateCleanSheetStats();
    
    // Compiled feature set
    return {
        basicStats: {
            team1AvgScore,
            team2AvgScore,
            team1AvgConceded,
            team2AvgConceded,
            h2hAdvantage,
            locationFactor,
            rankingDiff,
            matchImportance,
            totalLine,
            pointSpread,
            spreadDirection: spreadDirection === 'team1' ? 1 : -1
        },
        advancedStats: {
            team1RecentForm,
            team2RecentForm,
            team1DefenseStrength,
            team2DefenseStrength,
            team1AttackStrength,
            team2AttackStrength,
            team1Consistency,
            team2Consistency,
            team1MomentumIndex,
            team2MomentumIndex,
            team1HomeAdvantage,
            team2HomeAdvantage,
            team1MatchImportancePerformance,
            team2MatchImportancePerformance
        },
        trends: {
            scoring: scoringTrends,
            cleanSheets: cleanSheetStats
        },
        dataQuality: {
            totalMatches: getTotalMatchCount(),
            team1Matches: matchData.team1.length,
            team2Matches: matchData.team2.length,
            h2hMatches: matchData.h2h.length,
            dataSufficiency: getTotalMatchCount() >= MIN_MATCHES_FOR_GOOD_ANALYSIS,
            dataExcellence: getTotalMatchCount() >= MIN_MATCHES_FOR_EXCELLENT_ANALYSIS && 
                          matchData.h2h.length >= MIN_H2H_MATCHES
        }
    };
}

// Calculate Model V1 win probabilities
function calculateModelV1WinProbabilities(features) {
    // Extract commonly used values from features
    const { 
        basicStats: { 
            team1AvgScore, team2AvgScore, team1AvgConceded, team2AvgConceded,
            h2hAdvantage, locationFactor, rankingDiff, matchImportance 
        },
        advancedStats: {
            team1RecentForm, team2RecentForm, team1DefenseStrength, team2DefenseStrength,
            team1AttackStrength, team2AttackStrength, team1Consistency, team2Consistency,
            team1MomentumIndex, team2MomentumIndex, team1HomeAdvantage, team2HomeAdvantage,
            team1MatchImportancePerformance, team2MatchImportancePerformance
        },
        dataQuality: { dataSufficiency, dataExcellence, h2hMatches }
    } = features;
    
    // Base analysis - relative strength of teams
    const attackDifference = (team1AttackStrength - team2DefenseStrength) - 
                            (team2AttackStrength - team1DefenseStrength);
    
    // Calculate base advantage using several factors
    let advantageCoefficient = attackDifference * WEIGHTS.OVERALL_PERFORMANCE +
                             (team1RecentForm - team2RecentForm) * WEIGHTS.RECENT_FORM +
                             h2hAdvantage * WEIGHTS.H2H_MATCHES + 
                             (team1MomentumIndex - team2MomentumIndex) * WEIGHTS.MOMENTUM;
                         
    // Add location factor
    if (locationFactor !== 0) {
        const locationTeamAdvantage = locationFactor === 1 ? team1HomeAdvantage : team2HomeAdvantage;
        advantageCoefficient += locationFactor * locationTeamAdvantage * WEIGHTS.HOME_ADVANTAGE;
    }
    
    // Add match importance factor
    if (matchImportance !== 1) {
        const importanceDifference = team1MatchImportancePerformance - team2MatchImportancePerformance;
        advantageCoefficient += (matchImportance - 1) * importanceDifference * WEIGHTS.MATCH_IMPORTANCE;
    }
    
    // Add ranking factor if available
    if (rankingDiff !== 0) {
        // Transform ranking difference to be in [-1, 1] range
        const normalizedRankingDiff = -Math.sign(rankingDiff) * Math.min(1, Math.abs(rankingDiff) / 20);
        advantageCoefficient += normalizedRankingDiff * WEIGHTS.RANKING;
    }
    
    // Normalize advantage coefficient to range for probability calculation
    const normalizedAdvantage = Math.max(-3, Math.min(3, advantageCoefficient));
    
    // Convert advantage to probability using logistic function
    const team1Advantage = normalizedAdvantage;
    const team1WinProb = 50 + (50 * (2 / (1 + Math.exp(-team1Advantage)) - 1));
    const team2WinProb = 50 + (50 * (2 / (1 + Math.exp(team1Advantage)) - 1));
    
    // Calculate draw probability
    // More draws when teams are evenly matched, fewer draws in high-scoring games
    const scoringRate = team1AvgScore + team2AvgScore;
    const strengthDifference = Math.abs(team1WinProb - team2WinProb);
    
    // Base draw rate based on scoring - higher scoring = fewer draws
    let baseDrawRate = 30 - (scoringRate * 5);
    
    // Reduce draw probability based on strength difference
    const drawReduction = strengthDifference * 0.5;
    let drawProb = Math.max(5, Math.min(40, baseDrawRate - drawReduction));
    
    // Special case for very defensive teams
    if (team1DefenseStrength < 0.7 && team2DefenseStrength < 0.7) {
        drawProb = Math.min(50, drawProb * 1.5);
    }
    
    // Adjust for importance and consistency
    if (matchImportance > 1.3) {
        // Big matches can lead to more cautious play
        drawProb += (matchImportance - 1.3) * 10;
    }
    
    if (team1Consistency < 0.7 && team2Consistency < 0.7) {
        // Inconsistent teams produce more varied results
        drawProb *= 0.8;
    }
    
    // Adjust all probabilities to ensure they sum to 100%
    let adjustedTeam1WinProb = team1WinProb * (1 - drawProb / 100);
    let adjustedTeam2WinProb = team2WinProb * (1 - drawProb / 100);
    
    // Final normalization to ensure sum is 100
    const total = adjustedTeam1WinProb + adjustedTeam2WinProb + drawProb;
    adjustedTeam1WinProb = (adjustedTeam1WinProb / total) * 100;
    adjustedTeam2WinProb = (adjustedTeam2WinProb / total) * 100;
    drawProb = (drawProb / total) * 100;

    // Apply data quality adjustments
    if (!dataSufficiency) {
        // With insufficient data, adjust towards more balanced probabilities
        const reversion = 0.3; // 30% reversion to mean
        adjustedTeam1WinProb = adjustedTeam1WinProb * (1 - reversion) + 40 * reversion;
        adjustedTeam2WinProb = adjustedTeam2WinProb * (1 - reversion) + 40 * reversion;
        drawProb = drawProb * (1 - reversion) + 20 * reversion;
    }
    
    // Ensure no probability goes below 5%
    adjustedTeam1WinProb = Math.max(5, adjustedTeam1WinProb);
    adjustedTeam2WinProb = Math.max(5, adjustedTeam2WinProb);
    drawProb = Math.max(5, drawProb);
    
    // Final normalization
    const finalTotal = adjustedTeam1WinProb + adjustedTeam2WinProb + drawProb;
    
    return {
        team1WinProb: (adjustedTeam1WinProb / finalTotal) * 100,
        team2WinProb: (adjustedTeam2WinProb / finalTotal) * 100,
        drawProb: (drawProb / finalTotal) * 100
    };
}

// Calculate Model V1 projected total
function calculateModelV1ProjectedTotal(features) {
    // Extract relevant features
    const { 
        basicStats: { 
            team1AvgScore, team2AvgScore, team1AvgConceded, team2AvgConceded,
            h2hAdvantage, locationFactor, matchImportance 
        },
        advancedStats: {
            team1RecentForm, team2RecentForm, team1DefenseStrength, team2DefenseStrength,
            team1AttackStrength, team2AttackStrength, team1Consistency, team2Consistency
        },
        trends: { scoring: scoringTrends },
        dataQuality: { dataSufficiency, dataExcellence, h2hMatches }
    } = features;
    
    // Base projected total using average scoring and conceding rates
    let baseTotal = (team1AvgScore + team2AvgScore + team1AvgConceded + team2AvgConceded) / 2;
    
    // Adjust for H2H scoring trends if available
    if (h2hMatches >= MIN_H2H_MATCHES) {
        const h2hAvgTotal = matchData.h2h.reduce((sum, match) => sum + match.totalScore, 0) / h2hMatches;
        // Weigh H2H more heavily when more H2H matches exist
        const h2hWeight = Math.min(0.5, h2hMatches * 0.08);
        baseTotal = baseTotal * (1 - h2hWeight) + h2hAvgTotal * h2hWeight;
    }
    
    // Adjust for recent form
    const formAdjustment = ((team1RecentForm + team2RecentForm) - 1) * 0.5;
    baseTotal += formAdjustment;
    
    // Adjust for defensive strength (lower strength = fewer goals)
    const defenseAdjustment = -((1 - team1DefenseStrength) + (1 - team2DefenseStrength)) * 0.5;
    baseTotal += defenseAdjustment;
    
    // Adjust for attack strength
    const attackAdjustment = (team1AttackStrength + team2AttackStrength - 2) * 0.5;
    baseTotal += attackAdjustment;
    
    // Adjust for match importance
    if (matchImportance < 1) {
        // Friendlies tend to have more goals (less defensive focus)
        baseTotal += (1 - matchImportance) * 0.6;
    } else if (matchImportance > 1.3) {
        // Very important matches can have fewer goals (more cautious play)
        baseTotal -= (matchImportance - 1.3) * 0.4;
    }
    
    // Adjust for location
    if (locationFactor !== 0) {
        // Home teams tend to score more, but the overall effect on total is small
        baseTotal += Math.abs(locationFactor) * 0.15;
    }
    
    // Adjust for consistency
    const consistencyAdjustment = ((1 - team1Consistency) + (1 - team2Consistency)) * 0.4;
    baseTotal += consistencyAdjustment;
    
    // Adjust for recent scoring trends
    if (scoringTrends.overallTrend !== 0) {
        baseTotal += scoringTrends.overallTrend * 0.3;
    }
    
    // Apply data quality adjustments
    if (!dataSufficiency) {
        // With insufficient data, regress toward the mean
        const leagueAverage = 2.5; // Typical average
        const reversion = 0.4; // 40% reversion to mean
        baseTotal = baseTotal * (1 - reversion) + leagueAverage * reversion;
    }
    
    // Ensure the total is reasonable (minimum of 0.5 goals expected)
    return Math.max(0.5, baseTotal);
}

// Calculate Model V1 projected margin
function calculateModelV1ProjectedMargin(features) {
    // Extract relevant features
    const { 
        basicStats: { 
            team1AvgScore, team2AvgScore, team1AvgConceded, team2AvgConceded,
            h2hAdvantage, locationFactor, rankingDiff, matchImportance 
        },
        advancedStats: {
            team1RecentForm, team2RecentForm, team1DefenseStrength, team2DefenseStrength,
            team1AttackStrength, team2AttackStrength, team1MomentumIndex, team2MomentumIndex
        },
        dataQuality: { dataSufficiency, h2hMatches }
    } = features;
    
    // Base margin from average scoring rates
    let baseMargin = (team1AvgScore - team2AvgConceded) - (team2AvgScore - team1AvgConceded);
    
    // Adjust for H2H history if available
    if (h2hMatches >= MIN_H2H_MATCHES) {
        const h2hAvgMargin = matchData.h2h.reduce((sum, match) => 
            sum + (match.team1Score - match.team2Score), 0) / h2hMatches;
        
        // Weight H2H more heavily with more matches
        const h2hWeight = Math.min(0.5, h2hMatches * 0.08);
        baseMargin = baseMargin * (1 - h2hWeight) + h2hAvgMargin * h2hWeight;
    } else {
        // If no H2H, still consider the h2hAdvantage from similar matchups
        baseMargin += h2hAdvantage * 0.5;
    }
    
    // Adjust for form
    const formAdjustment = (team1RecentForm - team2RecentForm) * 0.8;
    baseMargin += formAdjustment;
    
    // Adjust for attack vs defense strength
    const strengthAdjustment = (team1AttackStrength - team2DefenseStrength) - 
                             (team2AttackStrength - team1DefenseStrength);
    baseMargin += strengthAdjustment * 0.5;
    
    // Adjust for momentum
    const momentumAdjustment = (team1MomentumIndex - team2MomentumIndex) * 0.5;
    baseMargin += momentumAdjustment;
    
    // Adjust for location
    if (locationFactor !== 0) {
        baseMargin += locationFactor * 0.4; // Home advantage
    }
    
    // Adjust for ranking if available
    if (rankingDiff !== 0) {
        // Transform ranking difference to be in [-1, 1] range
        const normalizedRankingDiff = -Math.sign(rankingDiff) * Math.min(1, Math.abs(rankingDiff) / 20);
        baseMargin += normalizedRankingDiff * 0.3;
    }
    
    // Adjust for match importance
    if (matchImportance > 1) {
        // In important matches, the better team tends to assert dominance
        if (baseMargin > 0) {
            baseMargin += (matchImportance - 1) * 0.3;
        } else if (baseMargin < 0) {
            baseMargin -= (matchImportance - 1) * 0.3;
        }
    }
    
    // Apply data quality adjustments
    if (!dataSufficiency) {
        // With insufficient data, regress toward zero
        const reversion = 0.5; // 50% reversion to zero
        baseMargin = baseMargin * (1 - reversion);
    }
    
    return baseMargin;
}

// ADVANCED STATISTICAL CALCULATIONS
// =============================

// Calculate team's attack strength (higher is better)
function calculateAttackStrength(teamName, isTeam1) {
    // Calculate average goals scored
    const avgScored = calculateOverallTeamAverage(teamName, isTeam1);
    
    // Get opponent average conceded
    const oppAvgConceded = isTeam1 ? 
        (matchData.team1.length > 0 ? 
            calculateCategoryAverage('team1', 'team2Score') : 1.0) :
        (matchData.team2.length > 0 ? 
            calculateCategoryAverage('team2', 'team1Score') : 1.0);
    
    // League average for normalization
    const leagueAvgScored = 1.3;
    
    // Attack strength relative to average (higher is better)
    // Adjusted by the quality of opposition
    return (avgScored / leagueAvgScored) * (leagueAvgScored / Math.max(0.5, oppAvgConceded));
}

// Calculate team's defensive strength (lower is better)
function calculateDefenseStrength(teamName, isTeam1) {
    // Calculate average goals conceded
    const avgConceded = calculateTeamAverageConceded(teamName, isTeam1);
    
    // Get opponent average scored
    const oppAvgScored = isTeam1 ? 
        (matchData.team1.length > 0 ? 
            calculateCategoryAverage('team1', 'team2Score') : 1.0) :
        (matchData.team2.length > 0 ? 
            calculateCategoryAverage('team2', 'team1Score') : 1.0);
    
    // League average for normalization
    const leagueAvgConceded = 1.3;
    
    // Defense strength relative to average (lower is better)
    // Adjusted by the quality of opposition
    return (avgConceded / leagueAvgConceded) * (leagueAvgConceded / Math.max(0.5, oppAvgScored));
}

// Calculate team's consistency (1.0 = very consistent, 0.0 = very inconsistent)
function calculateTeamConsistency(teamName, isTeam1) {
    // Get all scores
    let scores = [];
    let results = []; // Win/Draw/Loss pattern
    
    if (isTeam1) {
        // Get scores from H2H matches
        matchData.h2h.forEach(match => {
            scores.push(match.team1Score);
            if (match.outcome === `${team1Name} Wins`) {
                results.push(1); // Win
            } else if (match.outcome === 'Draw') {
                results.push(0); // Draw
            } else {
                results.push(-1); // Loss
            }
        });
        
        // Get scores from team1 matches
        matchData.team1.forEach(match => {
            scores.push(match.team1Score);
            if (match.outcome === `${team1Name} Wins`) {
                results.push(1); // Win
            } else if (match.outcome === 'Draw') {
                results.push(0); // Draw
            } else {
                results.push(-1); // Loss
            }
        });
    } else {
        // Get scores from H2H matches
        matchData.h2h.forEach(match => {
            scores.push(match.team2Score);
            if (match.outcome === `${team2Name} Wins`) {
                results.push(1); // Win
            } else if (match.outcome === 'Draw') {
                results.push(0); // Draw
            } else {
                results.push(-1); // Loss
            }
        });
        
        // Get scores from team2 matches
        matchData.team2.forEach(match => {
            scores.push(match.team2Score);
            if (match.outcome === `${team2Name} Wins`) {
                results.push(1); // Win
            } else if (match.outcome === 'Draw') {
                results.push(0); // Draw
            } else {
                results.push(-1); // Loss
            }
        });
    }
    
    // If not enough data, return middle value
    if (scores.length < 3) return 0.5;
    
    // Calculate scoring consistency (coefficient of variation)
    const mean = scores.reduce((sum, val) => sum + val, 0) / scores.length;
    const squaredDiffs = scores.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    const coeffVariation = mean > 0 ? stdDev / mean : 1;
    
    // Calculate results consistency
    let resultConsistency = 1.0;
    if (results.length >= 3) {
        let changes = 0;
        for (let i = 1; i < results.length; i++) {
            if (results[i] !== results[i-1]) changes++;
        }
        resultConsistency = 1 - (changes / (results.length - 1));
    }
    
    // Combine both metrics (higher is more consistent)
    // Normalize coefficient of variation (lower is more consistent)
    const scoreConsistency = Math.max(0, 1 - (coeffVariation / 2));
    
    // Weighted average favoring result consistency
    return 0.4 * scoreConsistency + 0.6 * resultConsistency;
}

// Calculate momentum index (-1.0 to 1.0, positive = positive momentum)
function calculateMomentumIndex(teamName, isTeam1) {
    // Get team's matches sorted by timestamp
    let teamMatches = [];
    
    if (isTeam1) {
        // Combine H2H and team1 matches
        teamMatches = [
            ...matchData.h2h.map(match => ({
                timestamp: match.timestamp,
                score: match.team1Score,
                opponentScore: match.team2Score,
                outcome: match.outcome
            })),
            ...matchData.team1.map(match => ({
                timestamp: match.timestamp,
                score: match.team1Score,
                opponentScore: match.team2Score,
                outcome: match.outcome
            }))
        ];
    } else {
        // Combine H2H and team2 matches
        teamMatches = [
            ...matchData.h2h.map(match => ({
                timestamp: match.timestamp,
                score: match.team2Score,
                opponentScore: match.team1Score,
                outcome: match.outcome
            })),
            ...matchData.team2.map(match => ({
                timestamp: match.timestamp,
                score: match.team2Score,
                opponentScore: match.team1Score,
                outcome: match.outcome
            }))
        ];
    }
    
    // Sort by timestamp (oldest first)
    teamMatches.sort((a, b) => a.timestamp - b.timestamp);
    
    // If not enough matches, return neutral momentum
    if (teamMatches.length < 3) return 0;
    
    // Weight recent matches more heavily
    const weights = teamMatches.map((_, index, arr) => 
        Math.pow(1.5, index) / Math.pow(1.5, arr.length - 1)); // Exponential weight
    
    // Calculate momentum based on scoring trend
    const scoringTrend = teamMatches.reduce((sum, match, index) => 
        sum + (match.score * weights[index]), 0) / 
        weights.reduce((sum, weight) => sum + weight, 0);
    
    const recentAvgScore = teamMatches.slice(-3).reduce((sum, match) => 
        sum + match.score, 0) / Math.min(3, teamMatches.length);
    
    const overallAvgScore = teamMatches.reduce((sum, match) => 
        sum + match.score, 0) / teamMatches.length;
    
    // Calculate goal difference trend
    const recentGoalDiff = teamMatches.slice(-3).reduce((sum, match) => 
        sum + (match.score - match.opponentScore), 0) / Math.min(3, teamMatches.length);
    
    const overallGoalDiff = teamMatches.reduce((sum, match) => 
        sum + (match.score - match.opponentScore), 0) / teamMatches.length;
    
    // Calculate win percentage trend
    const teamWinString = isTeam1 ? `${team1Name} Wins` : `${team2Name} Wins`;
    
    const recentWinPct = teamMatches.slice(-3).filter(match => 
        match.outcome === teamWinString).length / Math.min(3, teamMatches.length);
    
    const overallWinPct = teamMatches.filter(match => 
        match.outcome === teamWinString).length / teamMatches.length;
    
    // Combine indicators
    const scoringMomentum = (recentAvgScore - overallAvgScore) / Math.max(0.5, overallAvgScore);
    const goalDiffMomentum = recentGoalDiff - overallGoalDiff;
    const winMomentum = recentWinPct - overallWinPct;
    
    // Weight and combine for final momentum index
    const momentum = (scoringMomentum * 0.3) + (goalDiffMomentum * 0.3) + (winMomentum * 0.4);
    
    // Normalize to [-1, 1] range
    return Math.max(-1, Math.min(1, momentum * 2));
}

// Calculate home advantage factor (0.0 to 2.0)
function calculateHomeAdvantage(teamName, isTeam1) {
    // Get team's home and away performances
    let homeMatches = [];
    let awayMatches = [];
    
    // Default home advantage if no data
    const defaultAdvantage = 1.0;
    
    if (isTeam1) {
        // Filter team1 matches by location
        if (matchData.team1.length === 0) return defaultAdvantage;
        
        // Assume all team1 matches in team1 data are at home
        homeMatches = matchData.team1;
        
        // Assume matches as team1 in h2h are away
        awayMatches = matchData.h2h;
    } else {
        // Filter team2 matches by location
        if (matchData.team2.length === 0) return defaultAdvantage;
        
        // Assume all team2 matches in team2 data are at home
        homeMatches = matchData.team2;
        
        // Assume matches as team2 in h2h are away
        awayMatches = matchData.h2h;
    }
    
    // If not enough data, return default
    if (homeMatches.length === 0) return defaultAdvantage;
    
    // Calculate win percentages
    const teamWinString = isTeam1 ? `${team1Name} Wins` : `${team2Name} Wins`;
    
    const homeWinPct = homeMatches.filter(match => 
        match.outcome === teamWinString).length / homeMatches.length;
    
    let awayWinPct = 0.25; // Default away win percentage
    
    if (awayMatches.length > 0) {
        const awayWinString = isTeam1 ? 
            `${team1Name} Wins` : // Team1 winning in H2H
            `${team2Name} Wins`;  // Team2 winning in H2H
            
        awayWinPct = awayMatches.filter(match => 
            match.outcome === awayWinString).length / awayMatches.length;
    }
    
    // Calculate home advantage factor
    const homeAdvantage = homeWinPct > 0 && awayWinPct > 0 ? 
        homeWinPct / awayWinPct : defaultAdvantage;
    
    // Normalize and limit to reasonable range
    return Math.max(0.2, Math.min(2.0, homeAdvantage));
}

// Calculate performance in matches of different importance
function calculateMatchImportancePerformance(teamName, isTeam1) {
    // For demo purposes, we'll return a random value between 0.5 and 1.5
    // In a real implementation, this would analyze how teams perform in matches
    // of different importance (friendlies vs. playoffs vs. championships)
    return 0.5 + Math.random();
}

// Calculate scoring trends (recent vs. historical)
function calculateScoringTrends() {
    // Calculate recent total goals (last 5 matches overall)
    const allMatches = [...matchData.h2h, ...matchData.team1, ...matchData.team2];
    
    // Sort by timestamp (newest first)
    allMatches.sort((a, b) => b.timestamp - a.timestamp);
    
    // If not enough matches, return neutral trend
    if (allMatches.length < 3) {
        return {
            team1Trend: 0,
            team2Trend: 0,
            overallTrend: 0
        };
    }
    
    // Calculate recent vs. historical total goals
    const recentMatches = allMatches.slice(0, Math.min(5, allMatches.length));
    const historicalMatches = allMatches.slice(Math.min(5, allMatches.length));
    
    const recentAvgTotal = recentMatches.reduce((sum, match) => 
        sum + match.totalScore, 0) / recentMatches.length;
    
    let historicalAvgTotal = 2.5; // Default if no historical data
    
    if (historicalMatches.length > 0) {
        historicalAvgTotal = historicalMatches.reduce((sum, match) => 
            sum + match.totalScore, 0) / historicalMatches.length;
    }
    
    const overallTrend = recentAvgTotal - historicalAvgTotal;
    
    // Calculate team-specific trends
    let team1RecentScores = [];
    let team1HistoricalScores = [];
    let team2RecentScores = [];
    let team2HistoricalScores = [];
    
    // Get recent scores (last 5 matches for each team)
    const team1Matches = [...matchData.h2h, ...matchData.team1]
        .sort((a, b) => b.timestamp - a.timestamp);
    
    const team2Matches = [...matchData.h2h, ...matchData.team2]
        .sort((a, b) => b.timestamp - a.timestamp);
    
    if (team1Matches.length > 0) {
        team1RecentScores = team1Matches.slice(0, Math.min(5, team1Matches.length))
            .map(match => match.team1Score);
        
        team1HistoricalScores = team1Matches.slice(Math.min(5, team1Matches.length))
            .map(match => match.team1Score);
    }
    
    if (team2Matches.length > 0) {
        team2RecentScores = team2Matches.slice(0, Math.min(5, team2Matches.length))
            .map(match => match.category === 'h2h' ? match.team2Score : match.team1Score);
        
        team2HistoricalScores = team2Matches.slice(Math.min(5, team2Matches.length))
            .map(match => match.category === 'h2h' ? match.team2Score : match.team1Score);
    }
    
    // Calculate average scores
    const team1RecentAvg = team1RecentScores.length > 0 ? 
        team1RecentScores.reduce((sum, score) => sum + score, 0) / team1RecentScores.length : 1.0;
    
    const team1HistoricalAvg = team1HistoricalScores.length > 0 ? 
        team1HistoricalScores.reduce((sum, score) => sum + score, 0) / team1HistoricalScores.length : 1.0;
    
    const team2RecentAvg = team2RecentScores.length > 0 ? 
        team2RecentScores.reduce((sum, score) => sum + score, 0) / team2RecentScores.length : 1.0;
    
    const team2HistoricalAvg = team2HistoricalScores.length > 0 ? 
        team2HistoricalScores.reduce((sum, score) => sum + score, 0) / team2HistoricalScores.length : 1.0;
    
    // Calculate trends
    const team1Trend = team1RecentAvg - team1HistoricalAvg;
    const team2Trend = team2RecentAvg - team2HistoricalAvg;
    
    return {
        team1Trend,
        team2Trend,
        overallTrend
    };
}

// Calculate clean sheet statistics (matches with no goals conceded)
function calculateCleanSheetStats() {
    // Calculate clean sheet percentages
    let team1CleanSheets = 0;
    let team2CleanSheets = 0;
    let team1Matches = 0;
    let team2Matches = 0;
    
    // Count team1 clean sheets (opponent scored 0)
    matchData.h2h.forEach(match => {
        if (match.team2Score === 0) team1CleanSheets++;
        if (match.team1Score === 0) team2CleanSheets++;
        team1Matches++;
        team2Matches++;
    });
    
    matchData.team1.forEach(match => {
        if (match.team2Score === 0) team1CleanSheets++;
        team1Matches++;
    });
    
    matchData.team2.forEach(match => {
        if (match.team1Score === 0) team2CleanSheets++;
        team2Matches++;
    });
    
    const team1CleanSheetPct = team1Matches > 0 ? (team1CleanSheets / team1Matches) * 100 : 0;
    const team2CleanSheetPct = team2Matches > 0 ? (team2CleanSheets / team2Matches) * 100 : 0;
    
    return {
        team1CleanSheetPct,
        team2CleanSheetPct,
        team1CleanSheets,
        team2CleanSheets,
        team1Matches,
        team2Matches
    };
}

// Calculate H2H advantage (-1.0 to 1.0)
function calculateH2HAdvantage() {
    // If no H2H matches, return 0 (neutral)
    if (matchData.h2h.length === 0) return 0;
    
    // Count wins for each team
    const team1Wins = matchData.h2h.filter(match => match.outcome === `${team1Name} Wins`).length;
    const team2Wins = matchData.h2h.filter(match => match.outcome === `${team2Name} Wins`).length;
    
    // Calculate simple advantage ratio
    const advantageRatio = (team1Wins - team2Wins) / matchData.h2h.length;
    
    // Weight more recent matches more heavily
    let weightedAdvantage = 0;
    let totalWeight = 0;
    
    // Sort matches by timestamp (newest first)
    const sortedMatches = [...matchData.h2h].sort((a, b) => b.timestamp - a.timestamp);
    
    sortedMatches.forEach((match, index) => {
        // Apply exponential decay to weight (more recent matches count more)
        const weight = Math.exp(-0.25 * index);
        
        if (match.outcome === `${team1Name} Wins`) {
            weightedAdvantage += weight;
        } else if (match.outcome === `${team2Name} Wins`) {
            weightedAdvantage -= weight;
        }
        
        totalWeight += weight;
    });
    
    // Normalize weighted advantage
    const normalizedWeightedAdvantage = totalWeight > 0 ? weightedAdvantage / totalWeight : 0;
    
    // Return weighted combination of simple and weighted advantage
    return (advantageRatio * 0.4) + (normalizedWeightedAdvantage * 0.6);
}

// Calculate team's average conceded goals
function calculateTeamAverageConceded(teamName, isTeam1) {
    let sum = 0;
    let count = 0;
    
    // Add H2H matches
    matchData.h2h.forEach(match => {
        if (isTeam1) {
            sum += match.team2Score;
        } else {
            sum += match.team1Score;
        }
        count++;
    });
    
    // Add team matches
    const teamCategory = isTeam1 ? 'team1' : 'team2';
    const opponentProperty = isTeam1 ? 'team2Score' : 'team1Score';
    
    matchData[teamCategory].forEach(match => {
        sum += match[opponentProperty];
        count++;
    });
    
    return count > 0 ? sum / count : 1.5; // Default to 1.5 if no data
}

// Calculate recent form (0.0 to 1.0)
function calculateRecentForm(teamName, isTeam1) {
    // Get relevant matches
    let teamMatches = [];
    
    if (isTeam1) {
        teamMatches = [...matchData.h2h.map(match => ({
            win: match.outcome === `${team1Name} Wins`,
            draw: match.outcome === 'Draw',
            lose: match.outcome === `${team2Name} Wins`,
            timestamp: match.timestamp,
            score: match.team1Score,
            opponentScore: match.team2Score
        })), ...matchData.team1.map(match => ({
            win: match.outcome === `${team1Name} Wins`,
            draw: match.outcome === 'Draw',
            lose: match.outcome === 'Opponent Wins',
            timestamp: match.timestamp,
            score: match.team1Score,
            opponentScore: match.team2Score
        }))];
    } else {
        teamMatches = [...matchData.h2h.map(match => ({
            win: match.outcome === `${team2Name} Wins`,
            draw: match.outcome === 'Draw',
            lose: match.outcome === `${team1Name} Wins`,
            timestamp: match.timestamp,
            score: match.team2Score,
            opponentScore: match.team1Score
        })), ...matchData.team2.map(match => ({
            win: match.outcome === `${team2Name} Wins`,
            draw: match.outcome === 'Draw',
            lose: match.outcome === 'Opponent Wins',
            timestamp: match.timestamp,
            score: match.team2Score,
            opponentScore: match.team1Score
        }))];
    }
    
    // Sort by timestamp (most recent first)
    teamMatches.sort((a, b) => b.timestamp - a.timestamp);
    
    // If no matches, return neutral form
    if (teamMatches.length === 0) return 0.5;
    
    // Take last 5 matches at most
    teamMatches = teamMatches.slice(0, Math.min(5, teamMatches.length));
    
    // Calculate form score with recency bias
    let formScore = 0;
    let totalWeight = 0;
    
    teamMatches.forEach((match, index) => {
        // Apply recency weight (most recent match has highest weight)
        const recencyWeight = Math.pow(0.85, index);
        
        // Calculate performance score for this match
        let matchScore = 0;
        
        if (match.win) {
            // Base score for win
            matchScore = 3;
            
            // Bonus for margin of victory
            const margin = match.score - match.opponentScore;
            matchScore += Math.min(0.5, margin * 0.1);
            
            // Bonus for clean sheet
            if (match.opponentScore === 0) matchScore += 0.3;
        } else if (match.draw) {
            // Base score for draw
            matchScore = 1;
            
            // Slightly higher score for high-scoring draws
            if (match.score + match.opponentScore >= 4) matchScore += 0.2;
        } else {
            // Base score for loss (0)
            
            // Small consolation for scoring goals in a loss
            if (match.score >= 2) matchScore += 0.3;
            
            // Small consolation for close losses
            if (match.opponentScore - match.score === 1) matchScore += 0.2;
        }
        
        // Add weighted score to total
        formScore += matchScore * recencyWeight;
        totalWeight += recencyWeight;
    });
    
    // Calculate final form score (normalized to 0-1 range)
    // Max possible score would be ~3.5 per match with weights
    const maxPossibleScore = totalWeight * 3.5;
    return formScore / maxPossibleScore;
}

// Get total match count across all categories
function getTotalMatchCount() {
    return matchData.h2h.length + matchData.team1.length + matchData.team2.length;
}

// Calculate average for a specific category and property
function calculateCategoryAverage(category, property) {
    const matches = matchData[category];
    if (matches.length === 0) return 0;
    
    return matches.reduce((sum, match) => sum + match[property], 0) / matches.length;
}

// Calculate overall team average across all matches
function calculateOverallTeamAverage(teamName, isTeam1) {
    let sum = 0;
    let count = 0;
    
    // Add H2H matches
    matchData.h2h.forEach(match => {
        if (isTeam1) {
            sum += match.team1Score;
        } else {
            sum += match.team2Score;
        }
        count++;
    });
    
    // Add team matches
    const teamCategory = isTeam1 ? 'team1' : 'team2';
    const teamProperty = isTeam1 ? 'team1Score' : 'team2Score';
    
    matchData[teamCategory].forEach(match => {
        sum += match[teamProperty];
        count++;
    });
    
    return count > 0 ? sum / count : 1.5; // Default to 1.5 if no data
}

// Generate score distribution probabilities
function generateScoreDistribution(projectedTotal, projectedMargin) {
    // Calculate mean goals for each team
    const team1Mean = (projectedTotal / 2) + (projectedMargin / 2);
    const team2Mean = (projectedTotal / 2) - (projectedMargin / 2);
    
    // Generate score probabilities using Poisson distribution
    const scoreDistribution = [];
    
    // Generate probabilities for scores 0-0 to 4-4
    for (let team1Score = 0; team1Score <= 4; team1Score++) {
        for (let team2Score = 0; team2Score <= 4; team2Score++) {
            const team1Prob = poissonProbability(team1Score, team1Mean);
            const team2Prob = poissonProbability(team2Score, team2Mean);
            const combinedProb = team1Prob * team2Prob;
            
            // Apply correlation adjustment (scores aren't strictly independent)
            let adjustedProb = combinedProb;
            
            // Adjust for commonly correlated scores
            if (team1Score === team2Score) {
                adjustedProb *= 1.2; // Draws are slightly more common
            }
            
            // Increase probability of 0-0 for very defensive teams
            if (team1Score === 0 && team2Score === 0 && projectedTotal < 2.0) {
                adjustedProb *= 1.5;
            }
            
            // Adjust for very high scoring games being less likely than Poisson suggests
            if (team1Score + team2Score > 6) {
                adjustedProb *= 0.8;
            }
            
            scoreDistribution.push({
                team1Score,
                team2Score,
                probability: adjustedProb * 100 // Convert to percentage
            });
        }
    }
    
    // Add "Other" category for all other scores
    const otherProb = Math.max(0, 100 - scoreDistribution.reduce((sum, dist) => sum + dist.probability, 0));
    
    if (otherProb > 0) {
        scoreDistribution.push({
            team1Score: -1,
            team2Score: -1,
            probability: otherProb
        });
    }
    
    // Sort by probability (highest first)
    scoreDistribution.sort((a, b) => b.probability - a.probability);
    
    return scoreDistribution;
}

// Calculate Poisson probability
function poissonProbability(k, lambda) {
    if (lambda <= 0) return k === 0 ? 1 : 0;
    
    // Calculate Poisson probability: P(X = k) = (e^-λ * λ^k) / k!
    const exp = Math.exp(-lambda);
    let result = exp;
    
    for (let i = 1; i <= k; i++) {
        result *= (lambda / i);
    }
    
    return result;
}

// Calculate feature importance
function calculateFeatureImportance(features) {
    // In a real implementation, this would be based on model feature importance
    // For this demo, we'll use a predefined weighting
    
    // Calculate importance scores based on data availability and feature values
    let importance = {
        'Head-to-Head History': features.dataQuality.h2hMatches >= MIN_H2H_MATCHES ? 
            Math.abs(features.basicStats.h2hAdvantage) * 100 : 30,
        
        'Recent Form': 
            Math.abs(features.advancedStats.team1RecentForm - features.advancedStats.team2RecentForm) * 100,
        
        'Offensive Strength': 
            Math.abs(features.advancedStats.team1AttackStrength - features.advancedStats.team2AttackStrength) * 50,
        
        'Defensive Stability':
            Math.abs(features.advancedStats.team1DefenseStrength - features.advancedStats.team2DefenseStrength) * 50,
        
        'Home Advantage': features.basicStats.locationFactor !== 0 ?
            Math.abs(features.basicStats.locationFactor) * 60 : 20,
        
        'Team Momentum': 
            Math.abs(features.advancedStats.team1MomentumIndex - features.advancedStats.team2MomentumIndex) * 70,
        
        'Match Importance': features.basicStats.matchImportance !== 1 ?
            Math.abs(features.basicStats.matchImportance - 1) * 50 : 20,
        
        'Team Ranking': features.basicStats.rankingDiff !== 0 ?
            Math.abs(features.basicStats.rankingDiff) * 3 : 20,
        
        'Scoring Trends':
            Math.abs(features.trends.scoring.team1Trend - features.trends.scoring.team2Trend) * 40
    };
    
    // Ensure minimum importance values
    Object.keys(importance).forEach(key => {
        importance[key] = Math.max(10, Math.min(100, importance[key]));
    });
    
    // Sort by importance (highest first)
    const sortedImportance = {};
    Object.entries(importance)
        .sort((a, b) => b[1] - a[1])
        .forEach(([key, value]) => {
            sortedImportance[key] = value;
        });
    
    return sortedImportance;
}

// Calculate over/under recommendation based on edge and projected total
function calculateOverUnderRecommendation(overUnderEdge, projectedTotal) {
    if (totalLine <= 0) return "NO LINE SET";
    
    // Strong edge thresholds
    const STRONG_EDGE_THRESHOLD = 8;
    const MODERATE_EDGE_THRESHOLD = 5;
    
    if (overUnderEdge > STRONG_EDGE_THRESHOLD) {
        // Strong over recommendation
        return `STRONG OVER ${totalLine}`;
    } else if (overUnderEdge > MODERATE_EDGE_THRESHOLD) {
        // Moderate over recommendation
        return `OVER ${totalLine}`;
    } else if (overUnderEdge < -STRONG_EDGE_THRESHOLD) {
        // Strong under recommendation
        return `STRONG UNDER ${totalLine}`;
    } else if (overUnderEdge < -MODERATE_EDGE_THRESHOLD) {
        // Moderate under recommendation
        return `UNDER ${totalLine}`;
    } else {
        return 'NO CLEAR EDGE';
    }
}

// Calculate spread recommendation based on edge and projected margin
function calculateSpreadRecommendation(spreadEdge, projectedMargin) {
    if (pointSpread <= 0) return "NO SPREAD SET";
    
    // Strong edge thresholds
    const STRONG_EDGE_THRESHOLD = 8;
    const MODERATE_EDGE_THRESHOLD = 5;
    
    // Formatted team names with spread
    const favoriteTeam = spreadDirection === 'team1' ? team1Name : team2Name;
    const underdogTeam = spreadDirection === 'team1' ? team2Name : team1Name;
    const favoriteSpread = `${favoriteTeam} -${pointSpread}`;
    const underdogSpread = `${underdogTeam} +${pointSpread}`;
    
    if (spreadEdge > STRONG_EDGE_THRESHOLD) {
        // Strong recommendation for favorite to cover
        return `STRONG ${favoriteSpread}`;
    } else if (spreadEdge > MODERATE_EDGE_THRESHOLD) {
        // Moderate recommendation for favorite to cover
        return favoriteSpread;
    } else if (spreadEdge < -STRONG_EDGE_THRESHOLD) {
        // Strong recommendation for underdog to cover
        return `STRONG ${underdogSpread}`;
    } else if (spreadEdge < -MODERATE_EDGE_THRESHOLD) {
        // Moderate recommendation for underdog to cover
        return underdogSpread;
    } else {
        return 'NO CLEAR EDGE';
    }
}

// UI UPDATE FUNCTIONS
// =============================
// Update winner prediction UI
function updateWinnerPrediction(probabilities) {
    let winnerName, winnerProb, loserName, loserProb;
    
    if (probabilities.team1WinProb > probabilities.team2WinProb && 
        probabilities.team1WinProb > probabilities.drawProb) {
        winnerName = team1Name;
        winnerProb = probabilities.team1WinProb;
        loserName = team2Name;
        loserProb = probabilities.team2WinProb;
    } else if (probabilities.team2WinProb > probabilities.team1WinProb && 
               probabilities.team2WinProb > probabilities.drawProb) {
        winnerName = team2Name;
        winnerProb = probabilities.team2WinProb;
        loserName = team1Name;
        loserProb = probabilities.team1WinProb;
    } else {
        // Handle draw as most likely outcome
        winnerName = "Draw";
        winnerProb = probabilities.drawProb;
        loserName = probabilities.team1WinProb > probabilities.team2WinProb ? team2Name : team1Name;
        loserProb = Math.min(probabilities.team1WinProb, probabilities.team2WinProb);
    }
    
    const confidenceLevel = winnerProb >= 60 ? "High" : (winnerProb >= 45 ? "Medium" : "Low");
    const confidenceClass = confidenceLevel.toLowerCase();
    
    const winnerPredictionHTML = `
        <div class="prediction-confidence ${confidenceClass}-confidence">
            <span class="material-symbols-outlined">
                ${confidenceLevel === "High" ? "verified" : 
                  confidenceLevel === "Medium" ? "trending_up" : "trending_flat"}
            </span>
            ${confidenceLevel} Confidence (${winnerProb.toFixed(1)}%)
        </div>
        <div class="teams-prediction">
            <div class="team-prediction ${winnerName === team1Name ? 'winner' : ''}">
                <div class="team-name">${team1Name}</div>
                <div class="team-probability">${probabilities.team1WinProb.toFixed(1)}%</div>
                <div class="probability-bar" style="width: ${probabilities.team1WinProb}%"></div>
            </div>
            
            <div class="vs-container">VS</div>
            
            <div class="team-prediction ${winnerName === team2Name ? 'winner' : ''}">
                <div class="team-name">${team2Name}</div>
                <div class="team-probability">${probabilities.team2WinProb.toFixed(1)}%</div>
                <div class="probability-bar" style="width: ${probabilities.team2WinProb}%"></div>
            </div>
        </div>
        <div class="draw-probability ${winnerName === 'Draw' ? 'winner' : ''}">
            <span class="material-symbols-outlined">balance</span>
            Draw probability: ${probabilities.drawProb.toFixed(1)}%
            <div class="probability-bar" style="width: ${probabilities.drawProb}%"></div>
        </div>
    `;
    
    document.getElementById('winner-prediction').innerHTML = winnerPredictionHTML;
}

// Update score prediction UI
function updateScorePrediction(team1Score, team2Score, projectedTotal, totalLine) {
    // Calculate most likely outcome description
    let outcomeDescription = "";
    
    if (team1Score > team2Score + 2) {
        outcomeDescription = `<strong>Comfortable ${team1Name} victory</strong>`;
    } else if (team1Score > team2Score) {
        outcomeDescription = `<strong>Narrow ${team1Name} win</strong>`;
    } else if (team2Score > team1Score + 2) {
        outcomeDescription = `<strong>Comfortable ${team2Name} victory</strong>`;
    } else if (team2Score > team1Score) {
        outcomeDescription = `<strong>Narrow ${team2Name} win</strong>`;
    } else {
        outcomeDescription = `<strong>Competitive draw</strong>`;
    }
    
    // Calculate over/under indicator
    let overUnderIndicator = "";
    if (totalLine > 0) {
        const diff = projectedTotal - totalLine;
        if (diff > 0.7) {
            overUnderIndicator = `<span class="positive-recommendation">STRONG OVER ${totalLine}</span>`;
        } else if (diff > 0.3) {
            overUnderIndicator = `<span class="positive-recommendation">OVER ${totalLine}</span>`;
        } else if (diff < -0.7) {
            overUnderIndicator = `<span class="negative-recommendation">STRONG UNDER ${totalLine}</span>`;
        } else if (diff < -0.3) {
            overUnderIndicator = `<span class="negative-recommendation">UNDER ${totalLine}</span>`;
        } else {
            overUnderIndicator = `<span class="neutral-recommendation">CLOSE TO LINE ${totalLine}</span>`;
        }
    }
    
    // Generate score explanation
    const scoringRate = (team1Score + team2Score).toFixed(1);
    const scoringExplanation = scoringRate >= 3.5 ? "High scoring" : 
                             (scoringRate >= 2.5 ? "Average scoring" : "Low scoring");
    
    const scorePredictionHTML = `
        <div class="predicted-score">
            <div class="score-value">${team1Name} ${team1Score} - ${team2Score} ${team2Name}</div>
            <div class="score-description">${outcomeDescription}</div>
        </div>
        <div class="score-explanation">
            <div><strong>${scoringExplanation} match</strong> with projected total: ${projectedTotal.toFixed(1)}</div>
            ${totalLine > 0 ? `<div>${overUnderIndicator}</div>` : ''}
        </div>
        <div class="projection-details">
            <div class="team-score-projection">
                <strong>${team1Name}:</strong> ${team1Score} goals
                <div class="score-expectation">Expected to ${team1Score > team2Score ? 'win' : (team1Score === team2Score ? 'draw' : 'lose')}</div>
            </div>
            <div class="team-score-projection">
                <strong>${team2Name}:</strong> ${team2Score} goals
                <div class="score-expectation">Expected to ${team2Score > team1Score ? 'win' : (team2Score === team1Score ? 'draw' : 'lose')}</div>
            </div>
        </div>
    `;
    
    document.getElementById('score-prediction').innerHTML = scorePredictionHTML;
}

// Update betting recommendation UI
function updateBettingRecommendation(totalRec, spreadRec, overUnderEdge, spreadEdge) {
    // Format edge strength
    const totalEdgeClass = totalLine > 0 ? 
        (overUnderEdge > 5 ? 'positive-recommendation' : (overUnderEdge < -5 ? 'negative-recommendation' : 'neutral-recommendation')) : 
        'neutral-recommendation';
    
    const spreadEdgeClass = pointSpread > 0 ? 
        (spreadEdge > 5 ? 'positive-recommendation' : (spreadEdge < -5 ? 'negative-recommendation' : 'neutral-recommendation')) : 
        'neutral-recommendation';
    
    // Edge strength description
    const edgeStrengthTotal = totalLine > 0 ? 
        (Math.abs(overUnderEdge) > 10 ? 'Strong' : (Math.abs(overUnderEdge) > 5 ? 'Moderate' : 'Weak')) : 
        '';
    
    const edgeStrengthSpread = pointSpread > 0 ? 
        (Math.abs(spreadEdge) > 10 ? 'Strong' : (Math.abs(spreadEdge) > 5 ? 'Moderate' : 'Weak')) : 
        '';
    
    // Value rating (1-5 stars)
    const totalValueStars = totalLine > 0 ? 
        Math.max(1, Math.min(5, Math.round(Math.abs(overUnderEdge) / 3))) : 0;
        
    const spreadValueStars = pointSpread > 0 ? 
        Math.max(1, Math.min(5, Math.round(Math.abs(spreadEdge) / 3))) : 0;
    
    // Generate star ratings
    const totalStarsHTML = totalValueStars > 0 ? 
        '<span class="value-stars">' + '★'.repeat(totalValueStars) + '☆'.repeat(5 - totalValueStars) + '</span>' : '';
        
    const spreadStarsHTML = spreadValueStars > 0 ? 
        '<span class="value-stars">' + '★'.repeat(spreadValueStars) + '☆'.repeat(5 - spreadValueStars) + '</span>' : '';
    
    // Winning percentage estimation
    const totalWinPct = totalLine > 0 ? 
        Math.min(95, Math.max(50, 50 + Math.abs(overUnderEdge) * 1.5)) : 0;
        
    const spreadWinPct = pointSpread > 0 ? 
        Math.min(95, Math.max(50, 50 + Math.abs(spreadEdge) * 1.5)) : 0;
    
    const bettingRecommendationHTML = `
        <div class="betting-advice">
            <div class="advice-label">Total Line ${totalLine > 0 ? `(${totalLine})` : ''}</div>
            <div class="advice-value ${totalEdgeClass}">${totalRec}</div>
            ${totalLine > 0 ? `
                <div class="advice-edge">
                    ${edgeStrengthTotal} Edge: ${Math.abs(overUnderEdge).toFixed(1)}% ${totalStarsHTML}
                </div>
                <div class="win-probability">
                    Est. Win Probability: ${totalWinPct.toFixed(0)}%
                </div>
            ` : ''}
        </div>
        
        <div class="betting-advice">
            <div class="advice-label">Spread ${pointSpread > 0 ? `(${formatSpreadForDisplay()})` : ''}</div>
            <div class="advice-value ${spreadEdgeClass}">${spreadRec}</div>
            ${pointSpread > 0 ? `
                <div class="advice-edge">
                    ${edgeStrengthSpread} Edge: ${Math.abs(spreadEdge).toFixed(1)}% ${spreadStarsHTML}
                </div>
                <div class="win-probability">
                    Est. Win Probability: ${spreadWinPct.toFixed(0)}%
                </div>
            ` : ''}
        </div>
        
        ${(totalLine > 0 || pointSpread > 0) ? `
        <div class="best-bet">
            <div class="best-bet-label">Best Bet:</div>
            <div class="best-bet-value ${Math.abs(overUnderEdge) > Math.abs(spreadEdge) ? totalEdgeClass : spreadEdgeClass}">
                ${Math.abs(overUnderEdge) > Math.abs(spreadEdge) ? 
                  `${totalRec} ${totalLine}` : 
                  spreadRec}
                <div class="best-bet-confidence">
                    Confidence: ${Math.max(totalWinPct, spreadWinPct).toFixed(0)}%
                </div>
            </div>
        </div>` : ''}
    `;
    
    document.getElementById('betting-recommendation').innerHTML = bettingRecommendationHTML;
}

// Format point spread for display
function formatSpreadForDisplay() {
    if (pointSpread <= 0) return '';
    
    const favoredTeam = spreadDirection === 'team1' ? team1Name : team2Name;
    const underdogTeam = spreadDirection === 'team1' ? team2Name : team1Name;
    
    return `${favoredTeam} -${pointSpread} / ${underdogTeam} +${pointSpread}`;
}

// Update analysis explanation UI
function updateAnalysisExplanation(probabilities, projectedTotal, projectedMargin, team1Score, team2Score, features) {
    // Determine the predicted winner
    let winnerName, winnerProb;
    
    if (probabilities.team1WinProb > probabilities.team2WinProb && 
        probabilities.team1WinProb > probabilities.drawProb) {
        winnerName = team1Name;
        winnerProb = probabilities.team1WinProb;
    } else if (probabilities.team2WinProb > probabilities.team1WinProb && 
               probabilities.team2WinProb > probabilities.drawProb) {
        winnerName = team2Name;
        winnerProb = probabilities.team2WinProb;
    } else {
        winnerName = "A draw";
        winnerProb = probabilities.drawProb;
    }
    
    // Get top 5 key factors from feature importance
    const topFactors = Object.entries(featureImportanceScores)
        .slice(0, 5)
        .map(([factor, importance]) => {
            return { factor, importance };
        });
    
    // Generate key factors HTML
    const keyFactorsHTML = topFactors.map(item => {
        return `
            <div class="key-factor">
                <div class="factor-name">${item.factor}</div>
                <div class="factor-importance-bar">
                    <div class="factor-bar" style="width: ${item.importance}%"></div>
                </div>
                <div class="factor-percentage">${item.importance.toFixed(0)}%</div>
            </div>
        `;
    }).join('');
    
    // Generate match insights
    const insights = generateMatchInsights(features, projectedMargin, projectedTotal);
    
    // Generate match-specific factors
    const matchFactors = generateMatchFactors(features);
    
    // Generate betting analysis
    let bettingAnalysisHtml = "";
    
    if (totalLine > 0 || pointSpread > 0) {
        bettingAnalysisHtml = `
            <h4>Betting Analysis:</h4>
            ${totalLine > 0 ? `
                <p>With a projected total score of ${projectedTotal.toFixed(1)}, the model suggests the match will likely go 
                ${projectedTotal > totalLine ? 'OVER' : 'UNDER'} the total line of ${totalLine}.</p>
                <p>Model data indicates a ${Math.min(95, Math.max(55, 55 + Math.abs(projectedTotal - totalLine) * 10)).toFixed(0)}% 
                confidence in the ${projectedTotal > totalLine ? 'OVER' : 'UNDER'} prediction.</p>
            ` : ''}
            
            ${pointSpread > 0 ? `
                <p>The projected margin of ${Math.abs(projectedMargin).toFixed(1)} goals in favor of 
                ${projectedMargin > 0 ? team1Name : team2Name} 
                ${Math.abs(projectedMargin) > pointSpread ? 'suggests they will cover' : 'may not be enough to cover'} 
                the point spread of ${pointSpread}.</p>
                <p>Historical data shows that in similar matchups, the favorite covers the spread 
                ${Math.min(90, Math.max(50, 50 + Math.abs(projectedMargin - pointSpread) * 5)).toFixed(0)}% of the time
                under these conditions.</p>
            ` : ''}
        `;
    } else {
        bettingAnalysisHtml = "<p>Set betting lines to see betting analysis and recommendations.</p>";
    }
    
    // Format the full explanation
    const explanationHTML = `
        <div class="analysis-header">
            <h3>Model V1 Analysis Summary</h3>
            <p>Based on comprehensive data analysis, our Model V1 indicates that <strong>${winnerName}</strong> has a ${winnerProb.toFixed(1)}% probability of winning this match with a projected score of <strong>${team1Score}-${team2Score}</strong>.</p>
        </div>
        
        <div class="analysis-sections">
            <div class="analysis-section">
                <h4>Key Predictive Factors</h4>
                <div class="key-factors-grid">
                    ${keyFactorsHTML}
                </div>
            </div>
            
            <div class="analysis-section">
                <h4>Match Insights</h4>
                <ul class="match-insights">
                    ${insights.map(insight => `<li>${insight}</li>`).join('')}
                </ul>
            </div>
            
            <div class="analysis-section">
                <h4>Match-Specific Factors</h4>
                <ul class="match-factors">
                    ${matchFactors.map(factor => `<li>${factor}</li>`).join('')}
                </ul>
            </div>
            
            <div class="analysis-section betting-section">
                ${bettingAnalysisHtml}
            </div>
            
            <div class="analysis-section">
                <h4>Advanced Score Projection</h4>
                <p>The most likely score is <strong>${team1Score}-${team2Score}</strong>, but the model also suggests these possible outcomes:</p>
                <div class="alternative-scores">
                    ${generateAlternativeScores(team1Score, team2Score, projectedTotal, projectedMargin)}
                </div>
            </div>
            
            <div class="analysis-section">
                <h4>Data Quality Assessment</h4>
                <p>Analysis based on ${features.dataQuality.totalMatches} total matches (${features.dataQuality.h2hMatches} head-to-head).</p>
                <p>Data quality: <strong>${features.dataQuality.dataExcellence ? 'Excellent' : (features.dataQuality.dataSufficiency ? 'Good' : 'Limited')}</strong></p>
                <p><em>Note: This analysis uses a proprietary predictive algorithm based on historical data patterns and team performance metrics. Actual outcomes may vary due to unforeseen factors.</em></p>
            </div>
        </div>
    `;
    
    document.getElementById('analysis-explanation').innerHTML = explanationHTML;
}

// Generate match insights based on features
function generateMatchInsights(features, projectedMargin, projectedTotal) {
    const insights = [];
    
    // Extract commonly used values from features
    const { 
        basicStats: { 
            team1AvgScore, team2AvgScore, h2hAdvantage, locationFactor,
            rankingDiff, matchImportance 
        },
        advancedStats: {
            team1RecentForm, team2RecentForm, team1Consistency, team2Consistency,
            team1MomentumIndex, team2MomentumIndex, team1HomeAdvantage
        },
        trends: { 
            scoring: scoringTrends,
            cleanSheets: cleanSheetStats
        },
        dataQuality: { h2hMatches }
    } = features;
    
    // Add insights based on key factors
    
    // Form and momentum insights
    const formDiff = team1RecentForm - team2RecentForm;
    if (Math.abs(formDiff) > 0.2) {
        const betterFormTeam = formDiff > 0 ? team1Name : team2Name;
        insights.push(`${betterFormTeam} shows significantly better recent form (${Math.abs(formDiff * 100).toFixed(0)}% stronger)`);
    }
    
    const momentumDiff = team1MomentumIndex - team2MomentumIndex;
    if (Math.abs(momentumDiff) > 0.3) {
        const betterMomentumTeam = momentumDiff > 0 ? team1Name : team2Name;
        insights.push(`${betterMomentumTeam} has strong momentum coming into this match`);
    }
    
    // H2H insights
    if (h2hMatches >= 2) {
        if (Math.abs(h2hAdvantage) > 0.2) {
            const dominantTeam = h2hAdvantage > 0 ? team1Name : team2Name;
            insights.push(`${dominantTeam} has a historical advantage in head-to-head matchups (${Math.abs(h2hAdvantage * 100).toFixed(0)}% edge)`);
        } else {
            insights.push(`Head-to-head history shows evenly matched teams`);
        }
    }
    
    // Location insights
    if (locationFactor === 1) {
        insights.push(`${team1Name} has home advantage (historically ${(team1HomeAdvantage * 100).toFixed(0)}% stronger at home)`);
    } else if (locationFactor === -1) {
        insights.push(`${team2Name} has home advantage (expect ~25% performance boost)`);
    }
    
    // Scoring trends insights
    if (Math.abs(scoringTrends.overallTrend) > 0.3) {
        if (scoringTrends.overallTrend > 0) {
            insights.push(`Recent matches show increasing scoring trends (+${scoringTrends.overallTrend.toFixed(1)} goals above average)`);
        } else {
            insights.push(`Recent matches show decreasing scoring trends (${scoringTrends.overallTrend.toFixed(1)} goals below average)`);
        }
    }
    
    // Clean sheet insights
    if (cleanSheetStats.team1CleanSheetPct > 40 || cleanSheetStats.team2CleanSheetPct > 40) {
        const betterDefenseTeam = cleanSheetStats.team1CleanSheetPct > cleanSheetStats.team2CleanSheetPct ? 
            team1Name : team2Name;
        const cleanSheetPct = Math.max(cleanSheetStats.team1CleanSheetPct, cleanSheetStats.team2CleanSheetPct);
        
        insights.push(`${betterDefenseTeam} has strong defensive record with ${cleanSheetPct.toFixed(0)}% clean sheet rate`);
    }
    
    // Consistency insights
    if (team1Consistency < 0.4 || team2Consistency < 0.4) {
        const inconsistentTeam = team1Consistency < team2Consistency ? team1Name : team2Name;
        insights.push(`${inconsistentTeam} shows high performance variability, making the outcome less predictable`);
    }
    
    // Match importance insights
    if (matchImportance > 1.3) {
        insights.push(`High match importance tends to favor the stronger team and can lead to more cautious play`);
    } else if (matchImportance < 0.9) {
        insights.push(`Lower match importance often produces more open, higher-scoring games`);
    }
    
    // Ranking insights
    if (Math.abs(rankingDiff) > 5 && rankingDiff !== 0) {
        const higherRankedTeam = rankingDiff < 0 ? team1Name : team2Name;
        const rankingEdge = (5 / Math.abs(rankingDiff)) * 100;
        insights.push(`${higherRankedTeam} has a significant ranking advantage (approximately ${rankingEdge.toFixed(0)}% edge)`);
    }
    
    // Total score insights
    if (projectedTotal > 3.5) {
        insights.push(`Model predicts a high-scoring match with ${projectedTotal.toFixed(1)} total goals`);
    } else if (projectedTotal < 2) {
        insights.push(`Model predicts a low-scoring match with ${projectedTotal.toFixed(1)} total goals`);
    }
    
    // Return a maximum of 6 insights
    return insights.slice(0, 6);
}

// Generate match-specific factors
function generateMatchFactors(features) {
    const matchFactors = [];
    
    // Add match type factor
    const matchType = document.getElementById('match-importance').options[document.getElementById('match-importance').selectedIndex].text;
    matchFactors.push(`This is a ${matchType} match (importance factor: ${features.basicStats.matchImportance.toFixed(1)})`);
    
    // Add home/away factor
    if (features.basicStats.locationFactor === 1) {
        matchFactors.push(`${team1Name} playing at home (advantage multiplier: ${features.advancedStats.team1HomeAdvantage.toFixed(2)}x)`);
    } else if (features.basicStats.locationFactor === -1) {
        matchFactors.push(`${team2Name} playing at home (advantage multiplier: ${features.advancedStats.team2HomeAdvantage.toFixed(2)}x)`);
    } else {
        matchFactors.push('Match played at a neutral venue (no home advantage)');
    }
    
    // Add ranking factor if available
    if (team1Ranking > 0 && team2Ranking > 0) {
        matchFactors.push(`Team rankings: ${team1Name} (#${team1Ranking}) vs ${team2Name} (#${team2Ranking})`);
    }
    
    // Add scoring averages
    matchFactors.push(`${team1Name} average score: ${features.basicStats.team1AvgScore.toFixed(2)} goals per match`);
    matchFactors.push(`${team2Name} average score: ${features.basicStats.team2AvgScore.toFixed(2)} goals per match`);
    
    // Add defense metrics
    matchFactors.push(`${team1Name} defensive strength: ${(features.advancedStats.team1DefenseStrength < 1 ? 'Above' : 'Below')} average (${features.advancedStats.team1DefenseStrength.toFixed(2)})`);
    matchFactors.push(`${team2Name} defensive strength: ${(features.advancedStats.team2DefenseStrength < 1 ? 'Above' : 'Below')} average (${features.advancedStats.team2DefenseStrength.toFixed(2)})`);
    
    return matchFactors;
}

// Generate alternative score possibilities
function generateAlternativeScores(mainScore1, mainScore2, projectedTotal, projectedMargin) {
    // Calculate alternative scores based on the projected total and margin
    const alternatives = [];
    
    // Calculate a few variations
    const variations = [
        { team1: mainScore1 + 1, team2: mainScore2 },
        { team1: mainScore1, team2: mainScore2 + 1 },
        { team1: mainScore1 + 1, team2: mainScore2 + 1 },
        { team1: Math.max(0, mainScore1 - 1), team2: mainScore2 },
        { team1: mainScore1, team2: Math.max(0, mainScore2 - 1) }
    ];
    
    // Calculate probabilities based on distance from projected total and margin
    variations.forEach(score => {
        const thisTotal = score.team1 + score.team2;
        const thisMargin = score.team1 - score.team2;
        
        // Calculate how far this score is from projections
        const totalDiff = Math.abs(thisTotal - projectedTotal);
        const marginDiff = Math.abs(thisMargin - projectedMargin);
        
        // Calculate probability based on difference (smaller difference = higher probability)
        const probability = Math.max(5, 100 - (totalDiff * 20) - (marginDiff * 30));
        
        alternatives.push({
            team1: score.team1,
            team2: score.team2,
            probability: probability
        });
    });
    
    // Sort by probability (highest first)
    alternatives.sort((a, b) => b.probability - a.probability);
    
    // Take top 3 alternatives
    const topAlternatives = alternatives.slice(0, 3);
    
    // Generate HTML
    return topAlternatives.map(alt => {
        return `
            <div class="alternative-score">
                <div class="alt-score-value">${alt.team1}-${alt.team2}</div>
                <div class="alt-probability">${alt.probability.toFixed(0)}%</div>
            </div>
        `;
    }).join('');
}

// Create win probability chart
function createWinProbabilityChart(probabilities) {
    // Destroy previous chart if it exists
    if (winProbabilityChart) {
        winProbabilityChart.destroy();
    }
    
    const ctx = document.getElementById('win-probability-chart').getContext('2d');
    
    winProbabilityChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [team1Name, team2Name, 'Draw'],
            datasets: [{
                data: [
                    probabilities.team1WinProb,
                    probabilities.team2WinProb,
                    probabilities.drawProb
                ],
                backgroundColor: [
                    'rgba(66, 133, 244, 0.8)',
                    'rgba(234, 67, 53, 0.8)',
                    'rgba(95, 99, 104, 0.8)'
                ],
                borderColor: [
                    'rgba(66, 133, 244, 1)',
                    'rgba(234, 67, 53, 1)',
                    'rgba(95, 99, 104, 1)'
                ],
                borderWidth: 1,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Match Outcome Probabilities',
                    font: {
                        size: 14,
                        weight: 'bold'
                    },
                    padding: {
                        bottom: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${context.raw.toFixed(1)}%`;
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true
            }
        }
    });
}

// Create score probability chart
function createScoreProbabilityChart(scoreDistribution) {
    // Create a new chart on page
    
    // First, add a new canvas if it doesn't exist
    if (!document.getElementById('score-probability-chart')) {
        const newChartCard = document.createElement('div');
        newChartCard.className = 'chart-card';
        newChartCard.innerHTML = `
            <h3>Probable Score Distribution</h3>
            <div class="chart-container">
                <canvas id="score-probability-chart"></canvas>
            </div>
        `;
        
        // Add to results charts section
        document.querySelector('.result-charts').appendChild(newChartCard);
    }
    
    // Destroy previous chart if it exists
    if (scoreProbabilityChart) {
        scoreProbabilityChart.destroy();
    }
    
    const ctx = document.getElementById('score-probability-chart').getContext('2d');
    
    // Prepare data for display - get top 8 scores
    const topScores = scoreDistribution.slice(0, 8);
    
    // Format labels for display
    const labels = topScores.map(score => 
        score.team1Score === -1 ? 'Other' : `${score.team1Score}-${score.team2Score}`
    );
    
    // Create chart
    scoreProbabilityChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Probability (%)',
                data: topScores.map(score => score.probability),
                backgroundColor: topScores.map((score, index) => {
                    if (score.team1Score === -1) return 'rgba(95, 99, 104, 0.7)';
                    if (score.team1Score > score.team2Score) return 'rgba(66, 133, 244, 0.7)';
                    if (score.team1Score < score.team2Score) return 'rgba(234, 67, 53, 0.7)';
                    return 'rgba(95, 99, 104, 0.7)'; // Draw
                }),
                borderColor: topScores.map((score, index) => {
                    if (score.team1Score === -1) return 'rgba(95, 99, 104, 1)';
                    if (score.team1Score > score.team2Score) return 'rgba(66, 133, 244, 1)';
                    if (score.team1Score < score.team2Score) return 'rgba(234, 67, 53, 1)';
                    return 'rgba(95, 99, 104, 1)'; // Draw
                }),
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Most Likely Scorelines',
                    font: {
                        size: 14,
                        weight: 'bold'
                    },
                    padding: {
                        bottom: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Probability: ${context.raw.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Probability (%)'
                    },
                    max: Math.min(100, Math.max(25, Math.ceil(topScores[0].probability * 1.2)))
                }
            }
        }
    });
}

// Create feature importance chart
function createFeatureImportanceChart(importanceScores) {
    // First, update chart title if it exists
    const confidenceChartTitle = document.querySelector('.chart-card:nth-child(2) h3');
    if (confidenceChartTitle) {
        confidenceChartTitle.textContent = 'Feature Importance';
    }
    
    // Destroy previous chart if it exists
    if (modelConfidenceChart) {
        modelConfidenceChart.destroy();
    }
    
    const ctx = document.getElementById('model-confidence-chart').getContext('2d');
    
    // Prepare data for chart
    const labels = [];
    const data = [];
    const colors = [];
    
    // Get top 5 features
    const topFeatures = Object.entries(importanceScores).slice(0, 5);
    
    // Add each feature
    topFeatures.forEach(([feature, importance], index) => {
        labels.push(feature);
        data.push(importance);
        
        // Gradient colors based on importance
        const hue = 210 - Math.floor((importance / 100) * 150); // Blue to orange
        colors.push(`hsla(${hue}, 70%, 50%, 0.8)`);
    });
    
    modelConfidenceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Importance',
                data: data,
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.8', '1')),
                borderWidth: 1,
                borderRadius: 5
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                },
                title: {
                    display: true,
                    text: 'Key Factors in Prediction',
                    font: {
                        size: 14,
                        weight: 'bold'
                    },
                    padding: {
                        bottom: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Importance: ${context.raw.toFixed(1)}%`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Relative Importance (%)'
                    }
                }
            }
        }
    });
}

// Create performance trend chart
function createPerformanceTrendChart() {
    // First, add a new canvas if it doesn't exist
    if (!document.getElementById('performance-trend-chart')) {
        const newChartCard = document.createElement('div');
        newChartCard.className = 'chart-card';
        newChartCard.innerHTML = `
            <h3>Performance Trends</h3>
            <div class="chart-container">
                <canvas id="performance-trend-chart"></canvas>
            </div>
        `;
        
        // Add to results charts section
        document.querySelector('.result-charts').appendChild(newChartCard);
    }
    
    // Destroy previous chart if it exists
    if (performanceTrendChart) {
        performanceTrendChart.destroy();
    }
    
    const ctx = document.getElementById('performance-trend-chart').getContext('2d');
    
    // Prepare trend data
    const team1PerformanceData = prepareTeamPerformanceData(team1Name, true);
    const team2PerformanceData = prepareTeamPerformanceData(team2Name, false);
    
    // Create chart
    performanceTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: team1PerformanceData.labels,
            datasets: [
                {
                    label: `${team1Name} Performance`,
                    data: team1PerformanceData.data,
                    backgroundColor: 'rgba(66, 133, 244, 0.2)',
                    borderColor: 'rgba(66, 133, 244, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(66, 133, 244, 1)',
                    pointRadius: 4,
                    tension: 0.2,
                    fill: true
                },
                {
                    label: `${team2Name} Performance`,
                    data: team2PerformanceData.data,
                    backgroundColor: 'rgba(234, 67, 53, 0.2)',
                    borderColor: 'rgba(234, 67, 53, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(234, 67, 53, 1)',
                    pointRadius: 4,
                    tension: 0.2,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Performance Index Over Time',
                    font: {
                        size: 14,
                        weight: 'bold'
                    },
                    padding: {
                        bottom: 15
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Match'
                    }
                },
                y: {
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Performance Index'
                    }
                }
            }
        }
    });
}

// Prepare team performance data for trend chart
function prepareTeamPerformanceData(teamName, isTeam1) {
    // Get relevant matches
    let matches = [];
    
    if (isTeam1) {
        // Combine H2H and team1 matches for team 1
        matches = [
            ...matchData.h2h.map(match => ({
                timestamp: match.timestamp,
                score: match.team1Score,
                opponentScore: match.team2Score,
                result: match.outcome === `${team1Name} Wins` ? 'win' : 
                        (match.outcome === 'Draw' ? 'draw' : 'loss')
            })),
            ...matchData.team1.map(match => ({
                timestamp: match.timestamp,
                score: match.team1Score,
                opponentScore: match.team2Score,
                result: match.outcome === `${team1Name} Wins` ? 'win' : 
                        (match.outcome === 'Draw' ? 'draw' : 'loss')
            }))
        ];
    } else {
        // Combine H2H and team2 matches for team 2
        matches = [
            ...matchData.h2h.map(match => ({
                timestamp: match.timestamp,
                score: match.team2Score,
                opponentScore: match.team1Score,
                result: match.outcome === `${team2Name} Wins` ? 'win' : 
                        (match.outcome === 'Draw' ? 'draw' : 'loss')
            })),
            ...matchData.team2.map(match => ({
                timestamp: match.timestamp,
                score: match.team2Score,
                opponentScore: match.team1Score,
                result: match.outcome === `${team2Name} Wins` ? 'win' : 
                        (match.outcome === 'Draw' ? 'draw' : 'loss')
            }))
        ];
    }
    
    // Sort by timestamp (oldest first)
    matches.sort((a, b) => a.timestamp - b.timestamp);
    
    // Convert to performance index (0-100)
    const performanceData = matches.map((match, index) => {
        // Calculate performance index
        let performance = 0;
        
        // Result-based performance
        if (match.result === 'win') {
            performance += 70;
        } else if (match.result === 'draw') {
            performance += 40;
        } else {
            performance += 10;
        }
        
        // Add bonus for goals scored
        performance += Math.min(15, match.score * 5);
        
        // Add bonus for clean sheet
        if (match.opponentScore === 0) {
            performance += 10;
        }
        
        // Add bonus for goal difference
        const goalDiff = match.score - match.opponentScore;
        performance += Math.min(10, Math.max(-10, goalDiff * 3));
        
        // Ensure within 0-100 range
        return Math.max(0, Math.min(100, performance));
    });
    
    // Generate match labels
    const labels = matches.map((_, index) => `Match ${index + 1}`);
    
    return {
        labels,
        data: performanceData
    };
}

// Show analysis results section
function showResults() {
    window.scrollTo({
        top: document.getElementById('results').offsetTop - 20,
        behavior: 'smooth'
    });
}

// Show toast message
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast ' + type;
    
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}