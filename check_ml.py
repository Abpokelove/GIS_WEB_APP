try:
    import sklearn
    from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
    from sklearn.model_selection import cross_val_score, train_test_split
    from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
    print("scikit-learn is available! Version:", sklearn.__version__)
except Exception as e:
    print("scikit-learn error:", e)

try:
    import statsmodels
    print("statsmodels is available!")
except Exception as e:
    print("statsmodels error:", e)

try:
    import scipy
    print("scipy version:", scipy.__version__)
except Exception as e:
    print("scipy error:", e)
