const countDownFn = (time: number) => {
	setTimeout(() => {
		time--;
		console.log('count down:', time);
		if (time > 0) {
			return countDownFn(time);
		}
		return 0;
	}, 1000);
};

countDownFn(10);
