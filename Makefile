-include deploy.env

VERSION := $(shell node -p "require('./package.json').version")

js = $(shell find app -name '*.js' -not -path '*/\.*' | sed -e 's/app/dist/' )
#html = $(shell find app -name '*.html' | sed -e 's/app/dist/' )
css = $(shell find app -name '*.css' -not -path '*/\.*' | sed -e 's/app/dist/' )
#others = $(shell find app -type f -not -path '*/\.*' | grep -v -e '.js$$' -e '.html$$' -e '.css$$' | sed -e 's/app/dist/' )
others = $(shell find app -type f -not -path '*/\.*' | grep -v -e '.js$$' -e '.css$$' | sed -e 's/app/dist/' )
allfiles = $(shell find app -type f -not -path '*/\.*' | sed -e 's/app/dist/' )
dirs = $(shell find app -type d -not -path '*/\.*' | sed -e 's/app/dist/' -e 's/$$/\//' )

.PHONY: deploy clean serve setup_dev stop test

$(dirs): dist/%: app/%
	mkdir -p "$@"
	chmod 775 "$@"

$(js): dist/%: app/%
	@make "$(dir $@)"
	terser "$^" > "$@"
	chmod 644 "$@"

$(css): dist/%: app/%
	@make "$(dir $@)"
	cat "$^" | cssmin > "$@"
	chmod 644 "$@"

$(others): dist/%: app/% package.json
	@make "$(dir $@)"
	cp -a "`echo $@ | sed 's/dist/app/'`" "$@"
	sed -i 's/__VERSION__/$(VERSION)/g' "$@"
	chmod 644 "$@"

dist/sw.js: $(allfiles)
	npx workbox generateSW workbox-config.js

dist: dist/sw.js

# Use distribution config from ./deploy.env
deploy: dist
	s3cmd sync --no-mime-magic --guess-mime-type --delete-removed dist/ $(S3_BUCKET)
	aws cloudfront create-invalidation --distribution-id $(CLOUDFRONT_DIST_ID) --paths '/*'

serve: dist
	docker stop dual-n-back && docker rm dual-n-back || true
	docker run -dit --name dual-n-back -p 8081:80 \
		-v "$(PWD)/dist":/usr/local/apache2/htdocs/ \
		httpd:2.4
	echo "Server started at http://localhost:8081"

stop:
	docker stop dual-n-back
	docker rm dual-n-back

# Setup dev environment
setup_dev:
	npm install

test:
	npm test

clean:
	rm -rf dist/*
