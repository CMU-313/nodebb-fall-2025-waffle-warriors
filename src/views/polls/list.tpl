<!-- IMPORT partials/breadcrumbs.tpl -->

<div data-widget-area="header">
	{{{each widgets.header}}}
	{{widgets.header.html}}
	{{{end}}}
</div>

<div class="row">
	<div class="col-lg-9">
		<div class="d-flex justify-content-between align-items-center mb-3">
			<h1 class="h3">[[polls:title]]</h1>
			{{{ if loggedIn }}}
			<a href="{config.relative_path}/polls/create" class="btn btn-primary">
				<i class="fa fa-plus"></i> [[polls:create]]
			</a>
			{{{ end }}}
		</div>

		{{{ if polls.length }}}
		<div class="polls-list">
			{{{ each polls }}}
			<div class="card mb-3" style="position: relative; z-index: auto; clear: both;">
				<div class="card-body">
					<div class="d-flex justify-content-between align-items-start">
						<div class="flex-grow-1">
							<h5 class="card-title">
								<a href="{config.relative_path}/polls/{./pollId}" class="text-decoration-none">
									{./title}
								</a>
							</h5>
							{{{ if ./description }}}
							<p class="card-text text-muted">{./description}</p>
							{{{ end }}}
							<div class="d-flex align-items-center text-muted small">
								<span class="me-3">
									<i class="fa fa-user"></i> {./user.username}
								</span>
								<span class="me-3">
									<i class="fa fa-clock"></i> <span class="timeago" title="{./timestampISO}">{./timestamp}</span>
								</span>
								<span class="me-3">
									<i class="fa fa-chart-bar"></i> {./totalVotes} votes
								</span>
								<span>
									<i class="fa fa-list"></i> {./options.length} options
								</span>
							</div>
						</div>
						<div class="text-end">
							{{{ if ./status }}}
							{{{ if (./status === 'active') }}}
							<span class="badge bg-success">
								{./status}
							</span>
							{{{ else }}}
							<span class="badge bg-secondary">
								{./status}
							</span>
							{{{ end }}}
							{{{ end }}}
						</div>
					</div>
				</div>
			</div>
			{{{ end }}}
		</div>

		<!-- IMPORT partials/paginator.tpl -->
		{{{ else }}}
		<div class="alert alert-info">
			<i class="fa fa-info-circle"></i> [[polls:no-polls]]
		</div>
		{{{ end }}}
	</div>

	<div class="col-lg-3">
		<div data-widget-area="sidebar">
			{{{each widgets.sidebar}}}
			{{widgets.sidebar.html}}
			{{{end}}}
		</div>
	</div>
</div>

<div data-widget-area="footer">
	{{{each widgets.footer}}}
	{{widgets.footer.html}}
	{{{end}}}
</div>

<style>
.polls-list {
	display: block;
	width: 100%;
}

.polls-list .card {
	display: block !important;
	position: static !important;
	float: none !important;
	width: 100% !important;
	margin-bottom: 1rem !important;
	clear: both !important;
}

.polls-list .card-body {
	display: block;
	position: relative;
}
</style>
