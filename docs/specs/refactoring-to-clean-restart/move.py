def Move(percentage,price):
    return "{:.5f}".format(float(price)*(1+float(percentage)/100))

#
if __name__ == "__main__":
    main()